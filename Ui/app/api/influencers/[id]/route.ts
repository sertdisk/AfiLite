// Proxy: /api/influencers/[id] → backend /api/v1/influencers/:id (GET detail, PATCH update)
// Not: DELETE yok, kullanıcı talebi gereği şimdilik silme butonu olmayacak.
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:5000';
const JWT_COOKIE_NAMES = ['jwt_admin','jwt','access_token'];

function buildCookieHeader() {
  const all = cookies().getAll();
  const map = new Map(all.map(c => [c.name, c.value]));
  const parts: string[] = all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
  // Eğer 'jwt' yoksa ama admin_jwt veya access_token varsa, backend fallback'i için 'jwt' aliası ekle
  if (!map.has('jwt')) {
    const alias = map.get('jwt_admin') || map.get('access_token');
    if (alias) parts.push(`jwt=${encodeURIComponent(alias)}`);
  }
  return parts.join('; ');
}

// Liste route'ı ile aynı standardizasyon: admin_jwt → jwt → access_token
function bearerFromCookies() {
  const adminJwt = cookies().get('jwt_admin')?.value;
  const jwt = cookies().get('jwt')?.value;
  const access = cookies().get('access_token')?.value;
  const token = adminJwt || jwt || access;
  return token ? `Bearer ${token}` : null;
}

function passThroughHeaders() {
  const h = headers();
  const hdr: Record<string, string> = {
    'User-Agent': h.get('user-agent') || '',
    'Accept': h.get('accept') || 'application/json',
  };
  const bearer = bearerFromCookies();
  if (bearer) {
    hdr['Authorization'] = bearer;
  } else {
    // Authorization yoksa ama cookie mevcutsa yine de Bearer üretmeyi dene
    const cookieVals = cookies().getAll();
    const cookieMap = Object.fromEntries(cookieVals.map(c => [c.name, c.value]));
    for (const name of JWT_COOKIE_NAMES) {
      if (cookieMap[name]) {
        hdr['Authorization'] = `Bearer ${cookieMap[name]}`;
        break;
      }
    }
  }
  return hdr;
}

function getIdFrom(req: NextRequest): string | null {
  const url = new URL(req.url);
  const segs = url.pathname.split('/').filter(Boolean);
  const id = segs[segs.length - 1];
  return id || null;
}

export async function GET(req: NextRequest) {
  try {
    const id = getIdFrom(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    const cookieHeader = buildCookieHeader();
    // Backend'te tekil influencer admin detayı /api/v1/apply/:id adresinde bulunuyor.
    // src/routes/apply.js -> router.get('/apply/:id', requireAdmin, ...)
    const url = `${BACKEND_ORIGIN}/api/v1/apply/${encodeURIComponent(id)}`;
    const baseHeaders = passThroughHeaders();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (GET /api/influencers/[id])';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

// PATCH detail update
// Kabul edilen alanlar: name, email, social_handle, niche, channels (string[]), country, bio, website, status
export async function PATCH(req: NextRequest) {
  try {
    const id = getIdFrom(req);
    if (!id) {
      return new Response(JSON.stringify({ message: 'Geçersiz id' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const payload = await req.text();
    let json: any = {};
    try { json = JSON.parse(payload || '{}'); } catch {}

    // Hafif UI doğrulamaları (opsiyonel alanlar geldi ise kontrol)
    if (json.name !== undefined && (typeof json.name !== 'string' || json.name.trim().length < 2)) {
      return new Response(JSON.stringify({ message: 'İsim en az 2 karakter olmalıdır.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    if (json.email !== undefined && (typeof json.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(json.email))) {
      return new Response(JSON.stringify({ message: 'Geçerli bir email adresi giriniz.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    if (json.website !== undefined && json.website) {
      try { new URL(json.website); } catch {
        return new Response(JSON.stringify({ message: 'Geçerli bir website adresi giriniz.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
    }
    if (json.status !== undefined && !['pending', 'approved', 'rejected', 'suspended'].includes(json.status)) {
      return new Response(JSON.stringify({ message: 'Geçersiz status.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    if (json.channels !== undefined && json.channels != null) {
      if (!Array.isArray(json.channels) || !json.channels.every((s: any) => typeof s === 'string' && s.trim().length > 0)) {
        return new Response(JSON.stringify({ message: 'channels string[] olmalıdır.' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }
    }

    const cookieHeader = buildCookieHeader();
    // Backend'te tekil influencer admin güncelleme /api/v1/apply/:id/status adresinde bulunuyor.
    // Ancak UI'dan gelen PATCH tüm alanları güncelleyebilir.
    // Şimdilik sadece status güncellemesi için /apply/:id/status'e yönlendirelim.
    // Diğer alanlar için backend'de ayrı bir PATCH /influencers/:id ucu olmalı.
    // Eğer sadece status güncelleniyorsa:
    const updateUrl = `${BACKEND_ORIGIN}/api/v1/apply/${encodeURIComponent(id)}/status`;
    // Eğer tüm alanlar güncelleniyorsa ve backend'de /influencers/:id PATCH varsa onu kullan
    // const updateUrl = `${BACKEND_ORIGIN}/api/v1/influencers/${encodeURIComponent(id)}`;
    const url = updateUrl; // Şimdilik sadece status güncelleme için
    const baseHeaders = passThroughHeaders();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...baseHeaders,
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
      return new Response(JSON.stringify({ message: msg || 'Influencer güncelleme başarısız.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, { status: res.status, headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    const message = err?.message || 'Proxy sırasında beklenmeyen bir hata oluştu (PATCH /api/influencers/[id])';
    return new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}