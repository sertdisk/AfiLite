// Proxy: /api/codes → backend /api/v1/codes (GET, POST, byId handlers: GET/PUT/DELETE)
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

export async function GET(_req: NextRequest) {
  try {
    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes`;
    const res = await fetch(url, {
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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    let json: any = {};
    try { json = JSON.parse(payload || '{}'); } catch {}

    const influencer_id = Number(json?.influencer_id);
    const discount_percentage = Number(json?.discount_percentage);
    const commission_pct = Number(json?.commission_pct);
    const code = json?.code;
    const is_active = json?.is_active;

    if (!influencer_id || influencer_id <= 0) {
      return new Response(JSON.stringify({ message: 'Geçerli bir influencer_id giriniz (pozitif sayı).' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    if (!(discount_percentage >= 1 && discount_percentage <= 100)) {
      return new Response(JSON.stringify({ message: 'İndirim yüzdesi 1-100 arasında olmalıdır.' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    if (!(commission_pct >= 1 && commission_pct <= 100)) {
      return new Response(JSON.stringify({ message: 'Komisyon yüzdesi 1-100 arasında olmalıdır.' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...passThroughHeaders(),
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        influencer_id,
        code,
        discount_percentage,
        commission_pct,
        is_active: is_active !== undefined ? !!is_active : true,
      }),
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const maybe = JSON.parse(text || '{}');
        msg = maybe?.message || maybe?.error || msg;
      } catch {}
      return new Response(JSON.stringify({ message: msg || 'Kod oluşturma başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (POST /api/codes)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

// Not: /api/codes/[id] için ayrı bir route handler dosyası ekleyeceğiz:
// admin-ui/app/api/codes/[id]/route.ts → backend /api/v1/codes/:id GET/PUT/DELETE proxy