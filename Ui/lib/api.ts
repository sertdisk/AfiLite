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

  let fullUrl = url.startsWith('/') ? `${process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:5003'}${url}` : url;
  
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
  [key: string]: any;
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
  read_at?: string | null;
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
    `/api/v1/influencers/search${qs}`,
    { method: 'GET' }
  );
  return result.items || [];
}

//==============================================================================
// ADMIN ALERTS API
//==============================================================================

export async function listAlerts(): Promise<SystemAlert[]> {
  return request<SystemAlert[]>('/api/v1/alerts', { method: 'GET' });
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

export async function getAdminMessageThreadsSummary(params?: { filter?: 'unread' | 'all' | 'sent' | 'incoming' }): Promise<{ items: MessageThreadSummary[] }> {
  const qs = params?.filter ? `?filter=${params.filter}` : '';
  return request(`/api/v1/messages/admin-threads-summary${qs}`);
}

export async function getThread(params: { influencerId: number }): Promise<{ items: Message[] }> {
  const qs = `?influencerId=${params.influencerId}`;
  return request(`/api/v1/messages/thread${qs}`, { method: 'GET' });
}

export async function sendAdminMessage(influencerId: number, body: string): Promise<{ message: string; item: Message }> {
  return request('/api/v1/messages', {
    method: 'POST',
    body: { to: 'influencer', influencerId, body },
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


//==============================================================================
// OTHER ADMIN FUNCTIONS (Restored)
//==============================================================================

export async function getAdminCodes(params: any): Promise<any> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/v1/codes?${query}`);
}

export async function getAdminBalanceSummary(): Promise<AdminBalanceSummary> {
  return request<AdminBalanceSummary>('/api/v1/balance/admin-summary/summary', { method: 'GET' });
}

export async function getAdminSalesStats(): Promise<AdminSalesStats> {
  return request<AdminSalesStats>('/api/v1/sales/stats', { method: 'GET' });
}

export async function searchAdminCode(code: string): Promise<any> {
    return request(`/api/v1/codes/search/${code}`);
}

export async function postAdminSale(payload: any): Promise<any> {
    return request('/api/v1/sale', { method: 'POST', body: payload });
}

export async function getAdminRecentSales(limit: number = 20): Promise<any[]> {
  const response = await request<{ items: any[] }>(`/api/v1/sales?limit=${limit}`);
  return response.items || [];
}

export async function putAdminCode(id: number, payload: any): Promise<any> {
  return request(`/api/v1/codes/${id}`, { method: 'PUT', body: payload });
}