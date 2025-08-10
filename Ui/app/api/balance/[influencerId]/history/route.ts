// Proxy: /api/balance/[influencerId]/history → backend /api/v1/balance/:influencerId/history (GET movements)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function buildCookieHeader() {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
}

function passThroughHeaders() {
  const h = headers();
  return {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
  };
}

function extractInfluencerId(req: NextRequest): string | null {
  const url = new URL(req.url);
  // URL pattern: /api/balance/:influencerId/history
  const parts = url.pathname.split('/').filter(Boolean); // ['api','balance',':influencerId','history']
  if (parts.length < 4) return null;
  return parts[parts.length - 2] || null; // pick segment before 'history'
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
    const url = `${BACKEND_ORIGIN}/api/v1/balance/${encodeURIComponent(influencerId)}/history`;

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
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/balance/[influencerId]/history)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}