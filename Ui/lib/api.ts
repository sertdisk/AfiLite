/* Açıklama (TR):
 * Bu dosya, admin UI'nin backend ile konuşması için minimal ve güvenli yardımcıları içerir.
 * Server-only API'ler (next/headers gibi) kullanılmaz; kütüphane hem client hem server tüketimine uygundur.
 * - Cookie tabanlı kimlik doğrulama için fetch varsayılan olarak credentials: 'include' kullanır.
 * - Authorization başlığı eklenmez. Gerekirse ileride authMode ile genişletilebilir.
 * - Hata yönetimi: Backend'in döndüğü { error | message } yüzeye taşınır ve Error/ApiError olarak fırlatılır.
 * - Aşağıda influencer başvuru ve profil uçlarına özel istemci fonksiyonları eklenmiştir.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface InfluencerPasswordUpdatePayload {
  currentPassword: string;
  newPassword: string;
}

export interface SocialAccount {
  id: number;
  influencer_id: number;
  platform: string;
  handle: string;
  url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountPayload {
  platform: string;
  handle: string;
  url?: string | null;
}

export interface PaymentAccount {
  id: number;
  influencer_id: number;
  bank_name: string;
  account_holder_name: string;
  iban: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentAccountPayload {
  bank_name: string;
  account_holder_name: string;
  iban: string;
}

type AuthMode = 'none' | 'bearer';

/**
 * Ortak istek sarmalayıcısı (TR):
 * - next/headers bağımlılığı yoktur.
 * - Varsayılan olarak JSON içerik türü ve credentials: 'include' ile çalışır.
 * - Authorization eklenmez (authMode === 'bearer' ileride kullanılabilir).
 */
export async function request<T = unknown>(
  url: string,
  opts: {
    method?: HttpMethod;
    body?: any;
    headers?: HeadersInit;
    authMode?: AuthMode;
    cache?: RequestCache;
  } = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };

  // URL zaten absolute ise değiştirme (örn: http:// veya https:// ile başlıyorsa)
  const isAbsolute = /^https?:\/\//i.test(url);
  // Tüm istekleri localhost:5002'ye yönlendir
  const fullUrl = isAbsolute ? url : `http://localhost:5003${url}`;
  const res = await fetch(fullUrl, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
    cache: opts.cache ?? 'no-store'
  } as RequestInit);

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, 'Yetkilendirme hatası');
  }

  // Başarısız yanıtlarda backend mesajını okumaya çalışalım
  if (!res.ok) {
    let message = 'İstek başarısız.';
    try {
      const data = await res.json();
      if (data?.error) message = String(data.error);
      else if (data?.message) message = String(data.message);
      else message = JSON.stringify(data);
    } catch {
      const text = await res.text().catch(() => '');
      if (text) message = text;
    }
    throw new ApiError(res.status, message);
  }

  // JSON varsayıyoruz; backend farklı dönerse uyarlanabilir.
  return (await res.json()) as T;
}

/* =========================
 * TypeScript Tipleri (TR):
 * - InfluencerApplyPayload: başvuru formu payload'ı
 * - InfluencerUpdatePayload: profil güncelleme payload'ı
 * - Influencer: backend'in döndürdüğü influencer kaydı
 * - InfluencerSummary: dashboard özet verisi
 * channels string[] olarak tutulur; API ile konuşurken gerekirse join/split yapılır.
 * ========================= */
export type InfluencerStatus = 'pending' | 'approved' | 'rejected';

export interface Influencer {
  id: number;
  name: string;
  email: string;
  social_handle: string;
  niche: string;
  channels: string[]; // UI'da dizi; backend string tutuyorsa dönüştürürüz
  country: string;
  terms_accepted: boolean;
  bio?: string | null;
  website?: string | null;
  brandName?: string | null; // Yeni eklenen alan
  status: InfluencerStatus;
  created_at: string; // ISO
  updated_at?: string;
}

export interface InfluencerApplyPayload {
  name: string;
  email: string;
  social_handle: string;
  niche: string;
  channels: string[]; // formdan virgülle ayrılmış -> diziye
  country: string;
  terms_accepted: boolean;
  bio?: string;
  website?: string;
  brandName?: string; // Yeni eklenen alan
  /** Geçici alan (TR): Backend desteği geldiğinde schema uyumu için güncellenecek. */
  social_accounts?: Array<{
    platform: 'Instagram' | 'YouTube' | 'TikTok' | 'Other';
    platformName?: string;
    handleOrChannel: string;
    followers: number;
    avgViews: number;
  }>;
}

export interface InfluencerUpdatePayload {
  name?: string;
  social_handle?: string;
  niche?: string;
  channels?: string[]; // UI tarafında dizi
  country?: string;
  bio?: string | null;
  website?: string | null;
}

export interface InfluencerSummary {
  status: InfluencerStatus;
  created_at: string; // ISO
  days_since_application: number;
}

/* Yardımcı: UI <-> API arasında channels alanını dönüştürme
 * Backend TEXT(JSON) saklasa bile, client tarafından dizi göndermek güvenli (server JSON.stringify yapabilir).
 */
function channelsToApi(value: string[] | undefined | null): string[] | string | undefined {
  if (value == null) return value ?? undefined;
  // Backend string[] kabul ettiğinden doğrudan dizi döndür.
  return value.map((s) => s.trim()).filter(Boolean);
}

function channelsFromApi(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/* =========================
 * Influencer API istemci fonksiyonları
 * ========================= */

/** Başvuru oluşturma — POST /api/v1/influencers/apply
 * Not (TR): social_accounts alanı geçici olarak API'ye aynen iletilir. Backend desteği geldiğinde schema uyumu için güncellenecek.
 */
export async function postInfluencerApply(payload: InfluencerApplyPayload): Promise<{ id: number; status: InfluencerStatus; created_at: string }> {
  const body = {
    ...payload,
    channels: channelsToApi(payload.channels),
    // social_accounts varsa olduğu gibi gönderilir (router görmezden gelebilir).
    social_accounts: payload.social_accounts
  };
  // Public olabilir; cookie gerekmez. credentials: 'include' zararsızdır.
  return request<{ id: number; status: InfluencerStatus; created_at: string }>('/api/v1/influencers/apply', {
    method: 'POST',
    body
  });
}

/** Influencer kendi kodunu oluşturur — POST /api/v1/codes/me (JWT gerekli) */
export async function createMyDiscountCode(input?: { code?: string; discount_pct?: number; commission_pct?: number }): Promise<{
  message: string;
  code_id: number;
  code: { id: number; influencer_id: number; code: string; discount_pct: number; commission_pct: number; is_active: number; created_at?: string; approved_at?: string; }; // approved_at eklendi
}> {
  return request('/api/v1/codes/me', {
    method: 'POST',
    body: input ?? {}
  });
}

/** Admin: belirli bir influencerın kodlarını listele — GET /api/v1/codes/influencer/:id */
export async function adminListInfluencerCodes(influencerId: number): Promise<{ influencer_id: number; codes: any[] }> {
  return request(`/api/v1/codes/influencer/${influencerId}`, { method: 'GET' });
}

/** Admin: yeni kod oluştur — POST /api/v1/codes */
export async function adminCreateCode(payload: { influencer_id: number; code: string; discount_percentage: number; commission_pct?: number }): Promise<any> {
  return request('/api/v1/codes', {
    method: 'POST',
    body: payload
  });
}

/** Me — GET /api/v1/influencers/me (JWT gerekli) */
export async function getInfluencerMe(): Promise<Influencer | null> {
  try {
    const data = await request<any>('/api/v1/influencers/me', { method: 'GET' });
    const infl: Influencer = {
      ...data,
      brandName: data?.brand_name, // brand_name'i brandName olarak kullan
      channels: channelsFromApi(data?.channels)
    };
    return infl;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Profil güncelleme — PATCH /api/v1/influencers/me */
export async function patchInfluencerMe(partial: InfluencerUpdatePayload): Promise<Influencer> {
  try {
    const body = {
      ...partial,
      channels: partial.channels !== undefined ? channelsToApi(partial.channels) : undefined
    };
    const data = await request<any>('/api/v1/influencers/me', {
      method: 'PATCH',
      body
    });
    const infl: Influencer = {
      ...data,
      channels: channelsFromApi(data?.channels)
    };
    return infl;
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Özet — GET /api/v1/influencers/me/summary */
export async function getInfluencerSummary(): Promise<InfluencerSummary | null> {
  try {
    const data = await request<InfluencerSummary>('/api/v1/influencers/me/summary', { method: 'GET' });
    return data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** (Opsiyonel) Kendi kodlarımı listele — UI ihtiyaç duyarsa kullanılabilir
 * Not: Backend'de GET /codes/me uç noktası yoksa bu fonksiyon kullanılmaz.
 */
export async function listMyCodesUnsafe(): Promise<{
  items: Array<{
    id: number;
    influencer_id: number;
    code: string;
    discount_pct: number;
    commission_pct: number;
    is_active: number;
    created_at?: string;
    approved_at?: string; // approved_at eklendi
  }>;
}> {
  return request('/api/v1/codes/me', { method: 'GET' });
}

/** (Muhasebe) Toplam bakiye — GET /api/v1/balance/me */
export async function getMyBalance(): Promise<{ total_balance: number; currency?: string } | null> {
  try {
    return await request('/api/v1/balance/me', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** (Muhasebe) İşlem listesi — GET /api/v1/sales/me?code=CODE123 */
export async function getMySales(params?: { code?: string; limit?: number; offset?: number }): Promise<{
  items: Array<{
    id: number;
    date: string;
    code: string;
    customer: string;
    package_name: string;
    package_amount: number;
    commission_amount: number;
  }>;
  total_commission: number;
  total_count?: number; // Toplam öğe sayısı sayfalama için eklendi
}> {
  const q: string[] = [];
  if (params?.code) q.push(`code=${encodeURIComponent(params.code)}`);
  if (params?.limit) q.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params?.offset) q.push(`offset=${encodeURIComponent(String(params.offset))}`);
  const qs = q.length ? `?${q.join('&')}` : '';
  return request(`/api/v1/sales/me${qs}`, { method: 'GET' });
}

/** (Muhasebe) Ödeme/mahsuplaşma geçmişi — GET /api/v1/balance/me/settlements */
export async function getMySettlements(params?: { limit?: number; offset?: number; query?: string }): Promise<{
  items: Array<{
    id: number;
    date: string;
    method: string;
    account: string;
    amount: number;
    note?: string;
    // Yeni eklenecek alanlar (backend'den geliyorsa)
    bank_name?: string;
    account_owner?: string;
    balance_before_settlement?: number;
    balance_after_settlement?: number;
  }>;
  total_count?: number; // Toplam öğe sayısı sayfalama için eklendi
}> {
  const q: string[] = [];
  if (params?.limit) q.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params?.offset) q.push(`offset=${encodeURIComponent(String(params.offset))}`);
  if (params?.query) q.push(`query=${encodeURIComponent(params.query)}`);
  const qs = q.length ? `?${q.join('&')}` : '';
  return request(`/api/v1/balance/me/settlements${qs}`, { method: 'GET' });
}

/* =========================
 * Sistem Uyarıları API istemci fonksiyonları
 * ========================= */

export interface SystemAlert {
  id: number;
  message: string;
  created_at: string;
}

/** Okunmamış uyarıları getir — GET /api/v1/alerts/unread */
export async function getUnreadAlerts(): Promise<SystemAlert[]> {
  try {
    return await request<SystemAlert[]>('/api/v1/alerts/unread', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Uyarıyı okundu olarak işaretle — POST /api/v1/alerts/:id/read */
export async function markAlertRead(alertId: number): Promise<{ message: string }> {
  try {
    return await request(`/api/v1/alerts/${alertId}/read`, {
      method: 'POST'
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/* =========================
 * Admin Sistem Uyarıları API istemci fonksiyonları
 * ========================= */

export interface SystemAlertAdmin extends SystemAlert {
  id: number;
  message: string;
  created_at: string;
}

/** Tüm uyarıları listele (Admin) — GET /api/v1/alerts */
export async function listAlerts(): Promise<SystemAlertAdmin[]> {
  try {
    return await request<SystemAlertAdmin[]>('/api/v1/alerts', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Yeni uyarı oluştur (Admin) — POST /api/v1/alerts */
export async function createAlert(payload: { message: string }): Promise<SystemAlertAdmin> {
  try {
    return await request<SystemAlertAdmin>('/api/v1/alerts', {
      method: 'POST',
      body: payload
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Uyarı sil (Admin) — DELETE /api/v1/alerts/:id */
export async function deleteAlert(id: number): Promise<void> {
  try {
    await request(`/api/v1/alerts/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/* =========================
 * Mesajlaşma API istemci fonksiyonları
 * ========================= */

/** Yeni mesaj gönder — POST /api/v1/messages
 * Influencer -> Admin: { to:'admin', body }
 * Admin -> Influencer: { to:'influencer', influencerId, body }
 */
export async function sendMessage(input: { to: 'admin' | 'influencer'; body: string; influencerId?: number }): Promise<{ message: string; item: any }> {
  return request('/api/v1/messages', {
    method: 'POST',
    body: input
  });
}

/** Konuşma — GET /api/v1/messages/thread
 * Admin: ?influencerId=
 * Influencer: parametresiz (admin↔me)
 */
export async function getThread(params?: { influencerId?: number; limit?: number; before?: string }): Promise<{ items: any[] }> {
  const q: string[] = [];
  if (params?.influencerId) q.push(`influencerId=${encodeURIComponent(String(params.influencerId))}`);
  if (params?.limit) q.push(`limit=${encodeURIComponent(String(params.limit))}`);
  if (params?.before) q.push(`before=${encodeURIComponent(params.before)}`);
  const qs = q.length ? `?${q.join('&')}` : '';
  return request(`/api/v1/messages/thread${qs}`, { method: 'GET' });
}

/** Okundu — POST /api/v1/messages/read
 * Admin: { influencerId }
 * Influencer: body gereksiz
 */
export async function markRead(body?: { influencerId?: number }): Promise<{ updated: number }> {
  return request('/api/v1/messages/read', {
    method: 'POST',
    body: body ?? {}
  });
}

/** Okunmamış sayısı — GET /api/v1/messages/unread-count
 * Influencer: parametresiz
 * Admin: ?aggregate=true veya ?influencerId=
 */
export async function getUnreadCount(params?: { aggregate?: boolean; influencerId?: number }): Promise<{ unread: number }> {
  const q: string[] = [];
  if (params?.aggregate) q.push('aggregate=true');
  if (params?.influencerId) q.push(`influencerId=${encodeURIComponent(String(params.influencerId))}`);
  const qs = q.length ? `?${q.join('&')}` : '';
  return request(`/api/v1/messages/unread-count${qs}`, { method: 'GET' });
}

/** Admin arama — GET /api/v1/influencers/search?q= */
export async function searchInfluencers(q: string): Promise<{ items: Array<{ id: number; name: string; email: string; social_handle: string; status: string; codes: string[] }> }> {
  const qs = `?q=${encodeURIComponent(q)}`;
  return request(`/api/v1/influencers/search${qs}`, { method: 'GET' });
}

/** Şifre güncelleme — PATCH /api/v1/influencers/me/password */
export async function patchInfluencerMePassword(payload: InfluencerPasswordUpdatePayload): Promise<{ message: string }> {
  try {
    return await request('/api/v1/influencers/me/password', {
      method: 'PATCH',
      body: payload
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Sosyal hesapları listele — GET /api/v1/influencers/me/social-accounts */
export async function getInfluencerSocialAccounts(): Promise<SocialAccount[]> {
  try {
    return await request<SocialAccount[]>('/api/v1/influencers/me/social-accounts', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Sosyal hesap ekle — POST /api/v1/influencers/me/social-accounts */
export async function addInfluencerSocialAccount(payload: SocialAccountPayload): Promise<SocialAccount> {
  try {
    return await request<SocialAccount>('/api/v1/influencers/me/social-accounts', {
      method: 'POST',
      body: payload
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Sosyal hesap güncelle — PATCH /api/v1/influencers/me/social-accounts/:id */
export async function updateInfluencerSocialAccount(id: number, partial: Partial<SocialAccountPayload & { is_active: boolean }>): Promise<SocialAccount> {
  try {
    return await request<SocialAccount>(`/api/v1/influencers/me/social-accounts/${id}`, {
      method: 'PATCH',
      body: partial
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Sosyal hesap sil — DELETE /api/v1/influencers/me/social-accounts/:id */
export async function deleteInfluencerSocialAccount(id: number): Promise<void> {
  try {
    await request<void>(`/api/v1/influencers/me/social-accounts/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Ödeme hesaplarını listele — GET /api/v1/influencers/me/payment-accounts */
export async function getInfluencerPaymentAccounts(): Promise<PaymentAccount[]> {
  try {
    return await request<PaymentAccount[]>('/api/v1/influencers/me/payment-accounts', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Ödeme hesabı ekle — POST /api/v1/influencers/me/payment-accounts */
export async function addInfluencerPaymentAccount(payload: PaymentAccountPayload): Promise<PaymentAccount> {
  try {
    return await request<PaymentAccount>('/api/v1/influencers/me/payment-accounts', {
      method: 'POST',
      body: payload
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/** Aktif sözleşme içeriğini getir — GET /api/v1/contracts/active */
export async function getActiveContract(): Promise<{ id: number; content: string; version: number; is_active: boolean; created_at: string; updated_at: string } | null> {
  try {
    return await request('/api/v1/contracts/active', { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}