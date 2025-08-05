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
  const baseUrl = process.env.ADMIN_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('ADMIN_API_BASE_URL tanımlı değil.');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };

  // Şimdilik bearer eklemiyoruz; cookie tabanlı kimlik doğrulama esas.
  // if (opts.authMode === 'bearer' && someToken) headers['Authorization'] = `Bearer ${someToken}`;

  const res = await fetch(`${baseUrl}${url}`, {
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

/** Me — GET /api/v1/influencers/me (JWT gerekli) */
export async function getInfluencerMe(): Promise<Influencer | null> {
  try {
    const data = await request<any>('/api/v1/influencers/me', { method: 'GET' });
    const infl: Influencer = {
      ...data,
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