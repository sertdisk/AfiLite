// Proxy: /api/v1/balance/admin-summary/summary → backend /api/v1/balance/admin-summary/summary (GET)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5003';
const JWT_COOKIE_NAMES = ['jwt_admin','jwt','access_token'];

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

// GET /api/v1/balance/admin-summary/summary → backend GET /api/v1/balance/admin-summary/summary
export async function GET(req: NextRequest) {
  try {
    // Kritik: Authorization header'ını ve jwt alias cookie'sini mutlaka üret
    const cookieHeader = buildCookieHeader();
    const authHeader = bearerFromCookies();
    const url = `${BACKEND_ORIGIN}/api/v1/balance/admin-summary/summary`;
    console.log(`[Proxy] GET /api/v1/balance/admin-summary/summary -> Backend URL: ${url}`);

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
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/v1/balance/admin-summary/summary)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}