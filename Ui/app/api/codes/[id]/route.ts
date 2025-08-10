// Proxy: /api/codes/[id] → backend /api/v1/codes/:id (GET, PUT, DELETE)
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

function idFrom(req: NextRequest): string | null {
  const url = new URL(req.url);
  // Next.js route paramları: /api/codes/[id] → pathname'in son segmenti id
  const segs = url.pathname.split('/').filter(Boolean);
  const id = segs[segs.length - 1];
  return id || null;
}

export async function GET(req: NextRequest) {
  try {
    const id = idFrom(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes/${encodeURIComponent(id)}`;
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
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/codes/[id])';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = idFrom(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    const payload = await req.text();
    let json: any = {};
    try { json = JSON.parse(payload || '{}'); } catch {}

    // Basit doğrulamalar (opsiyonel alanlar için varsa kontrol et)
    if (json.discount_percentage !== undefined) {
      const v = Number(json.discount_percentage);
      if (!(v >= 1 && v <= 100)) {
        return new Response(JSON.stringify({ message: 'İndirim yüzdesi 1-100 arasında olmalıdır.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
    }
    if (json.commission_pct !== undefined) {
      const v = Number(json.commission_pct);
      if (!(v >= 1 && v <= 100)) {
        return new Response(JSON.stringify({ message: 'Komisyon yüzdesi 1-100 arasında olmalıdır.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
    }

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...passThroughHeaders(),
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(json),
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const maybe = JSON.parse(text || '{}');
        msg = maybe?.message || maybe?.error || msg;
      } catch {}
      return new Response(JSON.stringify({ message: msg || 'Kod güncelleme başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (PUT /api/codes/[id])';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = idFrom(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const cookieHeader = buildCookieHeader();
    const url = `${BACKEND_ORIGIN}/api/v1/codes/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...passThroughHeaders(),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const maybe = JSON.parse(text || '{}');
        msg = maybe?.message || maybe?.error || msg;
      } catch {}
      return new Response(JSON.stringify({ message: msg || 'Kod silme başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (DELETE /api/codes/[id])';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}