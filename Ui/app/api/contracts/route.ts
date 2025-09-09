// Proxy: /api/contracts → backend /api/v1/contracts (GET, POST)
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
    const backendUrl = new URL(`${BACKEND_ORIGIN}/api/v1/contracts`);
    
    const res = await fetch(backendUrl.toString(), {
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
    const payload = await req.json();
    const { content } = payload;

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ message: 'Sözleşme içeriği boş olamaz' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/contracts`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...passThroughHeaders(),
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ content }),
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const maybe = JSON.parse(text || '{}');
        msg = maybe?.message || maybe?.error || msg;
      } catch (error) { console.error(error); }
      return new Response(JSON.stringify({ message: msg || 'Sözleşme oluşturma başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (POST /api/contracts)';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
