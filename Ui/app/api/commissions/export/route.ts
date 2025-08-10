/**
 * Proxy: /api/commissions/export → BACKEND /api/v1/commissions/export
 * Supports: GET (CSV/XLSX export passthrough)
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
    'Accept': h.get('accept') || 'application/octet-stream',
  };
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = buildCookieHeader();
    const urlObj = new URL(req.url);
    const qs = urlObj.searchParams.toString();
    const url = `${BACKEND_ORIGIN}/api/v1/commissions/export${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...passThroughHeaders(), ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const disposition = res.headers.get('content-disposition') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    return new Response(buf, { status: res.status, headers: { 'Content-Type': contentType, 'Content-Disposition': disposition } });
  } catch (err: any) {
    const message = err?.message || 'Proxy error (GET /api/commissions/export)';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}