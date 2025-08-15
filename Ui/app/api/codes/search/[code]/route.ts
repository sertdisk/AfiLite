// Proxy: /api/codes/search/:code → backend /api/v1/codes/search/:code (GET)
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

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const cookieHeader = buildCookieHeader();
    const { code } = params;
    
    // Kod parametresini kontrol et
    if (!code || code.length < 2) {
      return new Response(JSON.stringify({ error: 'Kod en az 2 karakter olmalıdır' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    
    // Sadece alfanümerik karakterlere izin ver
    if (!/^[A-Z0-9]+$/i.test(code)) {
      return new Response(JSON.stringify({ error: 'Kod sadece harf ve rakam içerebilir' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    
    const backendUrl = `${BACKEND_ORIGIN}/api/v1/codes/search/${encodeURIComponent(code.toUpperCase())}`;
    
    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        ...passThroughHeaders(),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const body = await res.text();
    
    return new Response(body, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}