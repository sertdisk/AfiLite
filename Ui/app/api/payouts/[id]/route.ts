// Proxy: /api/payouts/[id] → backend /api/v1/payouts/:id (GET detail; future PATCH approve/reject/mark-paid)
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

function cookieHeader() {
  return cookies().getAll().map(c => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
}
function passthrough() {
  const h = headers();
  return {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
    'Content-Type': 'application/json',
  };
}
function extractId(req: NextRequest): string | null {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['api','payouts',':id']
  return parts[parts.length - 1] || null;
}

export async function GET(req: NextRequest) {
  try {
    const id = extractId(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/payouts/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { ...passthrough(), ...(cookieHeader() ? { Cookie: cookieHeader() } : {}) },
      cache: 'no-store',
    });
    const text = await res.text();
    const ct = res.headers.get('content-type') || 'application/json; charset=utf-8';
    return new Response(text, { status: res.status, headers: { 'Content-Type': ct }});
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e?.message || 'GET /api/payouts/[id] proxy hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// (Gelecek) PATCH /api/payouts/[id] → approve/reject/mark-paid işlemleri
// export async function PATCH(req: NextRequest) { ... }