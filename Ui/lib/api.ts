/// <reference lib="dom" />
interface HeadersInit {
  [name: string]: string;
}
type RequestCache = "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function request<T = unknown>(
  url: string,
  opts: {
    method?: HttpMethod;
    body?: any;
    headers?: HeadersInit;
    cache?: RequestCache;
  } = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };

  // Influencer paneli için API base URL'sini belirle
  let baseUrl = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:5003';
  if (url.startsWith('/api/influencer') || url.startsWith('/api/messages') || url.startsWith('/api/alerts') || url.startsWith('/api/codes/my') || url.startsWith('/api/balance') || url.startsWith('/api/sales/me') || url.startsWith('/api/sales/stats') || url.startsWith('/api/v1/influencer/performance/stats')) {
    baseUrl = process.env.NEXT_PUBLIC_INFLUENCER_API_BASE_URL || 'http://localhost:5003';
  }
  let fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  console.log(`API Request to: ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
    cache: opts.cache ?? 'no-store'
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, 'Yetkilendirme hatası');
  }

  if (!res.ok) {
    let message = 'İstek başarısız.';
    try {
      const data = await res.json();
      message = data?.error || data?.message || JSON.stringify(data);
    } catch (error) { /* ignore */ }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

//==============================================================================
// TYPE DEFINITIONS
//==============================================================================

export type InfluencerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Influencer {
  id: number;
  name: string;
  email: string;
  status: InfluencerStatus;
  created_at: string;
  brand_name?: string;
  [key: string]: any;
}

export interface SocialAccount {
  id: number;
  platform: string;
  username: string;
  address?: string;
  niche?: string;
  role?: string;
  followers?: number;
  avgViews?: number;
  is_active: boolean;
  created_at: string;
}

export interface PaymentAccount {
  id: number;
  bank_name: string;
  account_holder_name: string;
  iban: string;
  is_active: boolean;
  created_at: string;
}

export interface SystemAlert {
  id: number;
  message: string;
  created_at: string;
  target_influencer_ids?: string;
}

export interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_role: 'admin' | 'influencer';
  to_role: 'admin' | 'influencer';
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MessageThreadSummary {
  influencerId: number;
  influencerName: string;
  influencerEmail: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  isAdminSender: boolean;
  unreadCount: number;
}

export interface AdminBalanceSummary {
    balance: number;
    last_settlement_at: string | null;
    activeCodesCount: number;
    pendingCodesCount: number;
    activeInfluencersCount: number;
    totalCommission: number;
    totalSalesAmount: number;
    commissionSinceLastPayout: number;
    salesAmountSinceLastPayout: number;
    totalPayouts: number;
    totalSalesCount: number;
    paidSalesAmount: number;
}

export interface AdminSalesStats {
    stats: any;
}

//==============================================================================
// INFLUENCER & AUTH API
//==============================================================================

export async function searchInfluencers(query: string): Promise<Influencer[]> {
  if (query.length < 2 && query.length > 0) return [];
  const qs = `?q=${encodeURIComponent(query)}`;
  const result = await request<{ items: Influencer[] }>(
    `/api/influencers/search${qs}`,
    { method: 'GET' }
  );
  return result.items || [];
}

//==============================================================================
// ADMIN ALERTS API
//==============================================================================

export async function listAlerts(params: { page?: number, limit?: number } = {}): Promise<{ items: SystemAlert[], pagination: any }> {
  const query = new URLSearchParams(params as any).toString();
  return request(`/api/v1/alerts?${query}`);
}

export async function createAlert(payload: { message: string; target_influencer_ids?: number[] }): Promise<SystemAlert> {
  return request<SystemAlert>('/api/v1/alerts', {
    method: 'POST',
    body: payload
  });
}

export async function deleteAlert(id: number): Promise<void> {
  await request(`/api/v1/alerts/${id}`, { method: 'DELETE' });
}

//==============================================================================
// ADMIN MESSAGES API
//==============================================================================

export async function getAdminMessageThreadsSummary(params?: { filter?: 'unread' | 'all' | 'sent' | 'incoming', page?: number, limit?: number }): Promise<{ items: MessageThreadSummary[], pagination: any }> {
  const qs = new URLSearchParams(params as any).toString();
  return request(`/api/v1/messages/admin-threads-summary?${qs}`);
}

export async function getThread(params: { influencerId: number, page?: number, limit?: number }): Promise<{ items: Message[], pagination: any }> {
  const qs = new URLSearchParams(params as any).toString();
  return request(`/api/v1/messages/thread?${qs}`, { method: 'GET' });
}

export async function sendAdminMessage(influencerId: number | null, body: string): Promise<{ message: string; item: Message }> {
  const payload: any = { body };
  // Admin mesaj gönderiyorsa influencerId gerekli
  if (influencerId !== null) {
    payload.to = 'influencer';
    payload.influencerId = influencerId;
  }
  return request('/api/v1/messages', {
    method: 'POST',
    body: payload,
  });
}

export async function postAdminBulkMessage(payload: { body: string; influencerIds: number[] }): Promise<{ message: string }> {
  return request('/api/v1/messages/bulk', {
      method: 'POST',
      body: payload
  });
}

export async function markRead(params: { influencerId: number }): Promise<{ updated: number }> {
  return request('/api/v1/messages/read', {
    method: 'POST',
    body: { influencerId: params.influencerId },
  });
}

export async function markMyMessagesRead(): Promise<{ updated: number }> {
  return request('/api/messages/my/read', {
    method: 'POST',
  });
}

//==============================================================================
// OTHER ADMIN FUNCTIONS (Restored)
//==============================================================================

export async function getAdminCodes(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/codes?${query}`);
}

export async function getAdminBalanceSummary(): Promise<AdminBalanceSummary> {
  return request<AdminBalanceSummary>('/api/balance/admin-summary/summary', { method: 'GET' });
}

export async function getAdminSalesStats(): Promise<AdminSalesStats> {
  return request<AdminSalesStats>('/api/sales/stats', { method: 'GET' });
}

export async function searchAdminCode(code: string): Promise<any> {
    return request(`/api/codes/search/${code}`);
}

export async function postAdminSale(payload: any): Promise<any> {
    return request('/api/sale', { method: 'POST', body: payload });
}

export async function getAdminRecentSales(limit: number = 20): Promise<any[]> {
  const response = await request<{ items: any[] }>(`/api/sales?limit=${limit}`);
  return response.items || [];
}

export async function putAdminCode(id: number, payload: any): Promise<any> {
  return request(`/api/codes/${id}`, { method: 'PUT', body: payload });
}

export async function getAdminInfluencers(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/influencers?${query}`);
}

export async function getAdminInfluencerBalance(influencerId: number): Promise<any> {
    return request(`/api/balance/influencer/${influencerId}/summary`);
}

export async function getAdminPayouts(params: any): Promise<any> {
    // Parametre isimlerini backend ile uyumlu hale getir
    const backendParams: any = {};
    if (params.influencerId) backendParams.influencer_id = params.influencerId;
    if (params.from) backendParams.start_date = params.from;
    if (params.to) backendParams.end_date = params.to;
    if (params.page) backendParams.page = params.page;
    if (params.limit) backendParams.limit = params.limit;
    if (params.status) backendParams.status = params.status;
    
    const query = new URLSearchParams(backendParams).toString();
    return request(`/api/payouts?${query}`);
}

export async function postAdminPayout(payload: any): Promise<any> {
    // Parametre isimlerini backend ile uyumlu hale getir
    const backendPayload: any = {
        amount: payload.amount,
        iban: payload.iban,
        note: payload.note,
        status: payload.status
    };
    if (payload.influencerId) backendPayload.influencer_id = payload.influencerId;
    
    return request('/api/payouts', { method: 'POST', body: backendPayload });
}

export async function adminUpdatePayout(id: number, payload: any): Promise<any> {
    return request(`/api/payouts/${id}`, { method: 'PATCH', body: payload });
}

// Functions for Influencer Detail Page

export async function getAdminInfluencerDetail(id: string): Promise<Influencer> {
  return request<Influencer>(`/api/influencers/${id}`);
}

export async function patchAdminInfluencerDetail(id: string, data: Partial<Influencer>): Promise<Influencer> {
  // Parametre isimlerini backend ile uyumlu hale getir
  const backendData: any = {};
  if (data.name !== undefined) backendData.full_name = data.name;
  if (data.email !== undefined) backendData.email = data.email;
  if (data.brand_name !== undefined) backendData.brand_name = data.brand_name;
  if (data.status !== undefined) backendData.status = data.status;
  if (data.notes !== undefined) backendData.notes = data.notes;
  
  return request<Influencer>(`/api/influencers/${id}`, {
    method: 'PATCH',
    body: backendData,
  });
}

export async function adminListInfluencerCodes(influencerId: string): Promise<{ items: any[] }> {
  const result = await request<{ codes: any[] }>(`/api/codes/influencer/${influencerId}`);
  return { items: result.codes }; // Adapt to { items: [...] } structure
}

export async function adminListInfluencerSocialAccounts(influencerId: string): Promise<{ items: SocialAccount[] }> {
    return request(`/api/influencers/${influencerId}/social-accounts`);
}

export async function adminListInfluencerPaymentAccounts(influencerId: string): Promise<{ items: PaymentAccount[] }> {
    return request(`/api/influencers/${influencerId}/payment-accounts`);
}

export async function adminUpdateInfluencerSocialAccount(influencerId: string, accountId: number, payload: Partial<SocialAccount>): Promise<SocialAccount> {
    return request(`/api/influencers/${influencerId}/social-accounts/${accountId}`, {
        method: 'PATCH',
        body: payload,
    });
}

export async function adminDeleteInfluencerSocialAccount(influencerId: string, accountId: number): Promise<void> {
    await request(`/api/influencers/${influencerId}/social-accounts/${accountId}`, { method: 'DELETE' });
}

export async function adminDeleteInfluencerPaymentAccount(influencerId: string, accountId: number): Promise<void> {
    await request(`/api/influencers/${influencerId}/payment-accounts/${accountId}`, { method: 'DELETE' });
}

export async function adminCreateCode(payload: { influencer_id: string; code: string; commission_pct: number, discount_percentage: number }): Promise<any> {
  // Backend expects commission_pct and discount_percentage
  const body = {
      influencer_id: payload.influencer_id,
      code: payload.code,
      commission_pct: payload.commission_pct,
      discount_percentage: payload.discount_percentage
  };
  return request('/api/codes', { method: 'POST', body: body });
}

export async function getAdminSales(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/sales?${query}`);
}

export async function updateAdminSale(id: number, payload: any): Promise<any> {
    return request(`/api/sales/${id}`, { method: 'PATCH', body: payload });
}

// Influencer Dashboard Functions
export async function getInfluencerSummary(): Promise<any> {
    return request('/api/influencer/summary');
}

export async function getInfluencerDashboardStats(): Promise<any> {
    return request('/api/v1/influencer/dashboard/stats');
}

export async function getInfluencerPerformanceStats(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/v1/influencer/performance/stats?${query}`);
}

export async function createMyDiscountCode(payload: { code: string }): Promise<any> {
    return request('/api/codes/my', { method: 'POST', body: payload });
}

export async function getMyThread(): Promise<{ items: Message[] }> {
  return request('/api/messages/my-thread', { method: 'GET' });
}

export async function getUnreadCount(): Promise<{ unread: number }> {
    return request('/api/messages/unread-count');
}

export async function listMyCodesUnsafe(): Promise<{ items: any[] }> {
    const result = await request<{ codes: any[] }>('/api/codes/my');
    return { items: result.codes };
}

export async function getMyBalance(): Promise<any> {
    return request('/api/balance');
}

export async function getMySettlements(): Promise<any> {
    return request('/api/balance/history');
}

export async function getMySales(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/sales/me?${query}`);
}

//==============================================================================
// INFLUENCER PROFILE FUNCTIONS
//==============================================================================

export async function getInfluencerSocialAccounts(): Promise<{ items: SocialAccount[] }> {
  return request('/api/influencer/social-accounts');
}

export async function getInfluencerPaymentAccounts(): Promise<{ items: PaymentAccount[] }> {
  return request('/api/influencer/payment-accounts');
}

export async function patchInfluencerMe(payload: any): Promise<any> {
  return request('/api/influencer/me', { method: 'PATCH', body: payload });
}

export async function patchInfluencerMePassword(payload: any): Promise<any> {
  return request('/api/influencer/me/password', { method: 'PATCH', body: payload });
}

export async function addInfluencerSocialAccount(payload: any): Promise<any> {
  return request('/api/influencer/social-accounts', { method: 'POST', body: payload });
}

export async function getInfluencerMe(): Promise<any> {
  return request('/api/influencer/me', { method: 'GET' });
}

//==============================================================================
// YENİ EKLENEN FONKSİYONLAR
//==============================================================================

export async function updateInfluencerSocialAccount(id: number, payload: any): Promise<any> {
  return request(`/api/influencer/social-accounts/${id}`, { method: 'PUT', body: payload });
}

export async function deleteInfluencerSocialAccount(id: number): Promise<void> {
  await request(`/api/influencer/social-accounts/${id}`, { method: 'DELETE' });
}

export async function addInfluencerPaymentAccount(payload: any): Promise<any> {
  return request('/api/influencer/payment-accounts', { method: 'POST', body: payload });
}

export async function sendMessage(to: string | null, body: string, influencerId?: number): Promise<any> {
  const payload: any = { body };
  if (to !== null) {
    payload.to = to;
  }
  if (influencerId !== undefined) {
    payload.influencerId = influencerId;
  }
  return request('/api/messages', { method: 'POST', body: payload });
}

export async function getUnreadAlerts(): Promise<SystemAlert[]> {
  return request<SystemAlert[]>('/api/alerts/unread', { method: 'GET' });
}

export async function markAlertRead(alertId: number): Promise<{ message: string }> {
  return request(`/api/alerts/${alertId}/read`, { method: 'POST' });
}

export async function postInfluencerApply(payload: any): Promise<any> {
  return request('/api/apply', { method: 'POST', body: payload });
}