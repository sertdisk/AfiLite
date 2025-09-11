// Proxy: /api/codes/my → backend /api/v1/codes/me (GET)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5003';

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

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes/me`;
    
    console.log('[Frontend Proxy] GET /api/codes/my called with url:', url); // DEBUG LOG
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...passThroughHeaders(),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    console.log('[Frontend Proxy] Backend response status:', res.status); // DEBUG LOG
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const body = await res.text();
    console.log('[Frontend Proxy] Backend response text:', body); // DEBUG LOG
    return new Response(body, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    console.log('[Frontend Proxy] Error:', err); // DEBUG LOG
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}