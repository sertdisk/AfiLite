// Proxy: /api/influencers → backend /api/v1/influencers (GET list, POST create)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';
const JWT_COOKIE_NAMES = ['jwt_admin','jwt','access_token'];

/**
 * Bazı dağıtımlarda admin UI domaini ile backend domaini farklı olur ve
 * backend HttpOnly 'jwt' cookie'sini UI domainine set etmeyebilir.
 * Bu yüzden Authorization header'ını üretmek tek güvenilir yol.
 * Ayrıca debug kolaylığı için, backend'e admin olduğunu açıkça söyleyen query param ekleyelim.
 */
function ensureAdminQuery(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('_admin')) {
      u.searchParams.set('_admin', '1');
    }
    return u.toString();
  } catch {
    return url;
  }
}

function buildCookieHeader() {
  const all = cookies().getAll();
  const map = new Map(all.map(c => [c.name, c.value]));
  // Orijinal tüm cookie'leri ekle
  const parts: string[] = all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
  // Eğer 'jwt' yok ama admin_jwt veya access_token varsa, backend fallback'i için 'jwt' aliası ekle
  if (!map.has('jwt')) {
    const alias = map.get('jwt_admin') || map.get('access_token');
    if (alias) parts.push(`jwt=${encodeURIComponent(alias)}`);
  }
  return parts.join('; ');
}

function bearerFromCookies() {
  // Admin login sonrası cookie adı farklı olabilir: admin_jwt, jwt, access_token vb.
  for (const name of JWT_COOKIE_NAMES) {
    const val = cookies().get(name)?.value;
    if (val) return `Bearer ${val}`;
  }
  return null;
}

function passThroughHeaders() {
  const h = headers();
  const hdr: Record<string, string> = {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
    // ÖNEMLİ: Backend cors ayarında credentials:false olsa da server-side fetch'teyiz.
    // Ancak bazı reverse proxy'ler "Origin" başlığı yoksa Authorization'ı düşürüyor.
    // Bu yüzden Origin'i backend origin olarak ayarlıyoruz.
    'Origin': BACKEND_ORIGIN,
    'Referer': BACKEND_ORIGIN + '/',
  };
  const bearer = bearerFromCookies();
  if (bearer) {
    hdr['Authorization'] = bearer;
  } else {
    const cookieVals = cookies().getAll();
    const cookieMap = Object.fromEntries(cookieVals.map(c => [c.name, c.value]));
    for (const name of JWT_COOKIE_NAMES) {
      if (cookieMap[name]) {
        hdr['Authorization'] = `Bearer ${cookieMap[name]}`;
        break;
      }
    }
  }
  return hdr;
}

// GET /api/influencers?q=&status=&page=&limit= → backend GET /api/v1/influencers
export async function GET(req: NextRequest) {
  try {
    // Kritik: Authorization header'ını ve jwt alias cookie'sini mutlaka üret
    const cookieHeader = buildCookieHeader();
    const authHeader = bearerFromCookies();
    const urlObj = new URL(req.url);
    const q = urlObj.searchParams.get('q') || '';
    const status = urlObj.searchParams.get('status') || '';
    const page = urlObj.searchParams.get('page') || '';
    const limit = urlObj.searchParams.get('limit') || '';

    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    if (page) qs.set('page', page);
    if (limit) qs.set('limit', limit);

    // Admin liste uç noktası backend tarafında apply router'ı altında (requireAdmin) tanımlı:
    // src/app.js -> app.use('/api/v1', require('./routes/apply'));
    // src/routes/apply.js -> router.get('/apply', requireAdmin, ...)
    const url = ensureAdminQuery(`${BACKEND_ORIGIN}/api/v1/apply${qs.toString() ? `?${qs.toString()}` : ''}`);

    const baseHeaders = passThroughHeaders();
    const explicitAuth = bearerFromCookies();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(explicitAuth ? { Authorization: explicitAuth } : {}),
      },
      // reverse proxy bazı durumlarda 307 ile redirect edebilir; cred/headler düşmesin
      redirect: 'follow',
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/influencers)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

// POST /api/influencers → backend POST /api/v1/influencers
// Body beklenen alanlar (UI hedefi): name, email, social_handle, niche, channels (string[]), country, bio, website, status, terms_accepted
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    let json: any = {};
    try { json = JSON.parse(payload || '{}'); } catch {}

    // Basit UI doğrulamaları (backend detaylı doğrulama yapmalıdır)
    if (!json?.name || String(json.name).trim().length < 2) {
      return new Response(JSON.stringify({ message: 'İsim en az 2 karakter olmalıdır.' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    if (!json?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(json.email))) {
      return new Response(JSON.stringify({ message: 'Geçerli bir email adresi giriniz.' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    if (!json?.social_handle || String(json.social_handle).trim().length < 2) {
      return new Response(JSON.stringify({ message: 'Sosyal hesap bilgisi gerekli.' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // channels alanı dizi ise backend'e JSON.stringify ile göndermeyi tercih ediyoruz
    const bodyObj = {
      name: json.name,
      email: json.email,
      social_handle: json.social_handle,
      niche: json.niche ?? undefined,
      channels: Array.isArray(json.channels) ? json.channels : undefined,
      country: json.country ?? undefined,
      bio: json.bio ?? undefined,
      website: json.website ?? undefined,
      status: json.status ?? undefined,
      terms_accepted: json.terms_accepted === true,
    };

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/influencers`;
    const baseHeaders = passThroughHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(bodyObj),
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const maybe = JSON.parse(text || '{}');
        msg = maybe?.message || maybe?.error || msg;
      } catch {}
      return new Response(JSON.stringify({ message: msg || 'Influencer oluşturma başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (POST /api/influencers)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}