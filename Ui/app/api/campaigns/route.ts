// Proxy: /api/campaigns → backend /api/v1/campaigns (GET list, POST create - draft)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function cookieHeader() {
  return cookies().getAll().map(c => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
}
function passthrough(extra?: Record<string,string>) {
  const h = headers();
  return {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
    ...extra,
  };
}

// GET /api/campaigns?q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const inQs = new URL(req.url).searchParams;
    const qs = new URLSearchParams();
    ['q','page','limit'].forEach(k => {
      const v = inQs.get(k);
      if (v) qs.set(k, v);
    });
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/campaigns${qs.toString() ? `?${qs.toString()}` : ''}`, {
      method: 'GET',
      headers: { ...passthrough(), ...(cookieHeader() ? { Cookie: cookieHeader() } : {}) },
      cache: 'no-store',
    });
    const text = await res.text();
    const ct = res.headers.get('content-type') || 'application/json; charset=utf-8';
    return new Response(text, { status: res.status, headers: { 'Content-Type': ct }});
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e?.message || 'GET /api/campaigns proxy hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// DRAFT: POST /api/campaigns (create)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/campaigns`, {
      method: 'POST',
      headers: { ...passthrough({ 'Content-Type': 'application/json' }), ...(cookieHeader() ? { Cookie: cookieHeader() } : {}) },
      cache: 'no-store',
      body,
    });
    const text = await res.text();
    const ct = res.headers.get('content-type') || 'application/json; charset=utf-8';
    return new Response(text, { status: res.status, headers: { 'Content-Type': ct }});
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e?.message || 'POST /api/campaigns proxy hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}