/* Kısa açıklama: Influencer login route handler — Yalnızca influencer girişi içindir. */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Açıklama (TR):
 * - Bu dosya İNFLUENCER girişi içindir; admin ile izole çalışır.
 * - İstek body: { email, password }
 * - Backend endpoint: ADMIN_API_BASE_URL + /influencer/login
 * - Başarılıysa: jwt_influencer cookie set + 302 redirect(/influencer/dashboard)
 * - Hatalıysa: uygun status ve Türkçe mesaj döndürür.
 */
export async function POST(req: NextRequest) {
  const baseUrl = process.env.ADMIN_API_BASE_URL || 'http://localhost:5002'; // Backend 5002 portunda çalışıyor

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
  // Backend route envanterine göre gerçek uç: POST /influencer/login (prefixsiz)
  // ADMIN_API_BASE_URL'i kullanmak için forcedBase kaldırıldı.
  const url = `${baseUrl}/influencer/login`;
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
    // Geliştirme kolaylığı: token yoksa ama 200 döndüyse yine de ilerle (dev-only)
    if (!token && res.ok) {
      console.warn('[UI][login] Token bulunamadı; dev modda devam ediliyor.');
    }

    if (!token) {
      console.error('[UI][login] Token bulunamadı', { data });
      return NextResponse.json({ message: 'Beklenmeyen cevap: token bulunamadı.' }, { status: 502 });
    }

    const cookieSecure = String(process.env.COOKIE_SECURE).toLowerCase() === 'true';
    console.log('[UI][login:influencer] ✓ Başarılı, cookie set ediliyor. secure=', cookieSecure);

    // İzolasyon: influencer için ayrı cookie adı
    const response = NextResponse.redirect(new URL('/influencer/dashboard', req.url), { status: 302 });
    response.cookies.set({
      name: 'jwt_influencer',
      value: token,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax', // localhost'ta farklı portlar arası cookie gönderimi için 'strict' yerine 'lax' kullanıldı
      path: '/',
      maxAge: 15 * 60 // 15 dakika
    });

    return response;
  } catch (err: any) {
    console.error('[UI][login] İstek atılamadı', { url, error: err?.message || String(err) });
    return NextResponse.json({ message: 'Sunucuya erişilemiyor. Lütfen daha sonra deneyin.' }, { status: 502 });
  }
}