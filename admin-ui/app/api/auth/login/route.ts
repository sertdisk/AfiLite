/* Kısa açıklama: Login route handler — Backend'e kimlik doğrulama isteği atar, dönen JWT'yi HttpOnly cookie olarak set eder ve /dashboard'a yönlendirir. */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Açıklama (TR):
 * - İstek body: { email, password }
 * - Backend endpoint: ADMIN_API_BASE_URL + /api/v1/login
 * - Başarılıysa: jwt cookie set + 302 redirect(/dashboard)
 * - Hatalıysa: uygun status ve Türkçe mesaj döndürür.
 */
export async function POST(req: NextRequest) {
  const baseUrl = process.env.ADMIN_API_BASE_URL;
  if (!baseUrl) {
    console.error('[UI][login] ADMIN_API_BASE_URL eksik');
    return NextResponse.json({ message: 'Sunucu yapılandırma hatası: ADMIN_API_BASE_URL eksik.' }, { status: 500 });
  }

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    console.error('[UI][login] Geçersiz JSON body');
    return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  if (!payload.email || !payload.password) {
    console.warn('[UI][login] Eksik alanlar', { hasEmail: !!payload.email, hasPassword: !!payload.password });
    return NextResponse.json({ message: 'E-posta ve şifre zorunludur.' }, { status: 400 });
  }

  // Influencer girişi için doğru uç noktaya yönlendir
  const url = `${baseUrl}/api/v1/influencer/login`;
  try {
    console.log('[UI][login] → POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Not: Burada ADMIN API'ye json gövdesi gönderiyoruz.
      body: JSON.stringify({ email: payload.email, password: payload.password })
    });

    const resText = await res.text().catch(() => '');
    if (!res.ok) {
      // Backend bazen JSON döner; güvenli tarafta text -> json fallback yapılabilir
      let msg = resText;
      try {
        const maybe = JSON.parse(resText || '{}');
        msg = maybe?.message || maybe?.error || resText;
      } catch {}
      const status = res.status || 500;
      console.error('[UI][login] ← HATA', { status, msg });
      return NextResponse.json({ message: msg || 'Giriş başarısız.' }, { status });
    }

    // Not: Backend'in döndürdüğü ör. { token: '...' } gibi bir yapı beklenir.
    let data: any = {};
    try {
      data = JSON.parse(resText || '{}');
    } catch (e) {
      console.error('[UI][login] JSON parse hatası, backend text döndürdü', { resText: resText?.slice(0, 200) });
    }
    const token: string | undefined = data?.token || data?.jwt || data?.accessToken;

    if (!token) {
      console.error('[UI][login] Token bulunamadı', { data });
      return NextResponse.json({ message: 'Beklenmeyen cevap: token bulunamadı.' }, { status: 502 });
    }

    const cookieSecure = String(process.env.COOKIE_SECURE).toLowerCase() === 'true';
    console.log('[UI][login] ✓ Başarılı, cookie set ediliyor. secure=', cookieSecure);

    const response = NextResponse.redirect(new URL('/dashboard', req.url), { status: 302 });
    response.cookies.set({
      name: 'jwt',
      value: token,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 // 15 dakika
    });

    return response;
  } catch (err: any) {
    console.error('[UI][login] İstek atılamadı', { url, error: err?.message || String(err) });
    return NextResponse.json({ message: 'Sunucuya erişilemiyor. Lütfen daha sonra deneyin.' }, { status: 502 });
  }
}