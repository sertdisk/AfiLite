// Proxy: /api/balance/[influencerId] → backend /api/v1/balance/:influencerId/summary (GET balance summary for admin)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function buildCookieHeader() {
  const all = cookies().getAll();
  const parts = all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
  // jwt alias: admin_jwt/access_token varsa ve jwt yoksa alias ekle
  const hasJwt = all.some((c) => c.name === 'jwt');
  if (!hasJwt) {
    const alias = cookies().get('jwt_admin')?.value || cookies().get('access_token')?.value;
    if (alias) parts.push(`jwt=${encodeURIComponent(alias)}`);
  }
  return parts.join('; ');
}

function passThroughHeaders() {
  const h = headers();
  const hdr: Record<string, string> = {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
  };
  // Authorization üret: admin_jwt → jwt → access_token
  const token =
    cookies().get('jwt_admin')?.value ||
    cookies().get('jwt')?.value ||
    cookies().get('access_token')?.value;
  if (token) hdr['Authorization'] = `Bearer ${token}`;
  return hdr;
}

function extractInfluencerId(req: NextRequest): string | null {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

export async function GET(req: NextRequest) {
  try {
    const influencerId = extractInfluencerId(req);
    if (!influencerId) {
      return new Response(JSON.stringify({ message: 'Geçersiz influencerId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const cookieHeader = buildCookieHeader();
    // Admin summary (backend): /api/v1/balance/:influencerId/summary
    const url = `${BACKEND_ORIGIN}/api/v1/balance/${encodeURIComponent(influencerId)}/summary`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...passThroughHeaders(),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/balance/[influencerId])';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}