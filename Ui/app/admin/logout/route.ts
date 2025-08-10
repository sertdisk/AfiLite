/* Kısa açıklama: Logout route — jwt cookie'yi temizler ve /login'e yönlendirir. */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Açıklama (TR):
 * - GET isteğiyle çağrılır.
 * - jwt cookie'sini siler (maxAge: 0) ve /login sayfasına yönlendirir.
 */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), { status: 302 });
  res.cookies.set({
    name: 'jwt',
    value: '',
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  return res;
}