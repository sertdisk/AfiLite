// Proxy: /api/sales/[id] → backend /api/v1/sales/:id (GET detail)
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

function extractId(req: NextRequest): string | null {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
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

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/sales/${encodeURIComponent(id)}`;

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
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/sales/[id])';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}