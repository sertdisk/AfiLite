/**
 * Proxy: /api/sales → BACKEND /api/v1/sales
 * Supports: GET (list), POST (optional manual create passthrough if needed)
 */
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function buildCookieHeader() {
  return cookies().getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
}
function bearerFromCookies() {
  // Sunucu tarafında mevcutsa Authorization üret (ör: jwt veya access_token cookie)
  const jwt = cookies().get('jwt_admin')?.value || cookies().get('jwt_influencer')?.value || cookies().get('access_token')?.value;
  return jwt ? `Bearer ${jwt}` : null;
}
function passThroughHeaders() {
  const h = headers();
  const hdr: Record<string, string> = {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
  };
  const bearer = bearerFromCookies();
  if (bearer) hdr['Authorization'] = bearer;
  return hdr;
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = buildCookieHeader();
    const urlObj = new URL(req.url);
    const qs = urlObj.searchParams.toString();
    const url = `${BACKEND_ORIGIN}/api/v1/sales${qs ? `?${qs}` : ''}`;
    const baseHeaders = passThroughHeaders();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'X-Requested-With': 'XMLHttpRequest'
      },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy error (GET /api/sales)';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    let json: any = {};
    try { json = JSON.parse(bodyText || '{}'); } catch {}
    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/sales`;
    const baseHeaders = passThroughHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(json),
    });
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
      return new Response(JSON.stringify({ message: msg || 'Satış oluşturma başarısız.' }), { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy error (POST /api/sales)';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}