/* Kısa açıklama: Admin login route handler — Backend'e admin kimlik doğrulama isteği atar, dönen JWT'yi HttpOnly cookie olarak set eder ve /dashboard'a yönlendirir.
 * İzolasyon: Admin ve Influencer farklı cookie adları kullanır (jwt_admin vs jwt_influencer).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Açıklama (TR):
 * - Bu route YALNIZCA ADMIN girişi içindir.
 * - İstek body: { email, password }
 * - Backend endpoint: ADMIN_API_BASE_URL + /api/v1/login
 * - Başarılıysa: jwt cookie set + 302 redirect(/dashboard)
 * - Hatalıysa: uygun status ve Türkçe mesaj döndürür.
 */
export async function POST(req: NextRequest) {
  const baseUrl = process.env.ADMIN_API_BASE_URL || 'http://localhost:5003';

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    console.error('[UI][admin-login] Geçersiz JSON body');
    return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  if (!payload.email || !payload.password) {
    console.warn('[UI][admin-login] Eksik alanlar', { hasEmail: !!payload.email, hasPassword: !!payload.password });
    return NextResponse.json({ message: 'E-posta ve şifre zorunludur.' }, { status: 400 });
  }

  const url = `${baseUrl}/admin/login`;
  try {
    console.log('[UI][admin-login] → POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email, password: payload.password })
    });

    const resText = await res.text().catch(() => '');
    if (!res.ok) {
      let msg = resText;
      try {
        const maybe = JSON.parse(resText || '{}');
        msg = maybe?.message || maybe?.error || resText;
      } catch {}
      const status = res.status || 500;
      console.error('[UI][admin-login] ← HATA', { status, msg });
      return NextResponse.json({ message: msg || 'Giriş başarısız.' }, { status });
    }

    let data: any = {};
    try {
      data = JSON.parse(resText || '{}');
    } catch (e) {
      console.error('[UI][admin-login] JSON parse hatası, backend text döndürdü', { resText: resText?.slice(0, 200) });
    }
    const token: string | undefined = data?.token || data?.jwt || data?.accessToken;
    if (!token) {
      console.error('[UI][admin-login] Token bulunamadı', { data });
      return NextResponse.json({ message: 'Beklenmeyen cevap: token bulunamadı.' }, { status: 502 });
    }

    // Dev ortamında cookie taşınabilirliğini artır: secure=false (HTTP), SameSite=Lax
    const cookieSecureEnv = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
    const cookieSecure = process.env.NODE_ENV === 'production' ? cookieSecureEnv : false;

    console.log('[UI][admin-login] ✓ Başarılı, cookie set ediliyor. secure=', cookieSecure);
    console.log('[UI][admin-login] Token:', token); // DEBUG LOG

    // İzolasyon: admin için ayrı cookie adı
    const response = NextResponse.redirect(new URL('/admin/dashboard', req.url), { status: 302 });
    console.log('[UI][admin-login] Response before cookie set:', response.headers); // DEBUG LOG
    response.cookies.set({
      name: 'jwt_admin', // UI genelinde okunan cookie adıyla hizala
      value: token,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15 dakika
    });
    console.log('[UI][admin-login] Response headers:', response.headers); // DEBUG LOG

    return response;
  } catch (err: any) {
    console.error('[UI][admin-login] İstek atılamadı', { url, error: err?.message || String(err) });
    return NextResponse.json({ message: 'Sunucuya erişilemiyor. Lütfen daha sonra deneyin.' }, { status: 502 });
  }
}