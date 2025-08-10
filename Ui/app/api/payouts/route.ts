/**
 * Proxy: /api/payouts → BACKEND /api/v1/payouts
 * Supports: GET (list), POST (create)
 */
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function buildCookieHeader() {
  return cookies().getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
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
    const urlObj = new URL(req.url);
    const qs = urlObj.searchParams.toString();
    const url = `${BACKEND_ORIGIN}/api/v1/payouts${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...passThroughHeaders(), ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy error (GET /api/payouts)';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = buildCookieHeader();
    const payload = await req.text();
    let json: any = {};
    try { json = JSON.parse(payload || '{}'); } catch {}
    const url = `${BACKEND_ORIGIN}/api/v1/payouts`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...passThroughHeaders(), 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      body: JSON.stringify(json),
    });
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
      return new Response(JSON.stringify({ message: msg || 'Ödeme oluşturma başarısız.' }), { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy error (POST /api/payouts)';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}