/* Kısa açıklama: Korumalı Dashboard sayfası — JWT cookie yoksa /login'e yönlendirir, varsa basit panel görünümü sunar. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

export default function DashboardPage() {
  // Not: Server Component — cookie kontrolü SSR katmanında yapılır.
  const jwtCookie = cookies().get('jwt')?.value;

  if (!jwtCookie) {
    redirect('/login');
  }

  // Debug amaçlı: JWT payload'ını sunucu loguna yaz (imza doğrulaması yapmadan)
  try {
    const decoded = jwt.decode(jwtCookie || '');
    // Sadece payload'ı logla, token'ı loglama
    console.log('[UI][dashboard] jwt payload:', typeof decoded === 'object' ? { ...decoded } : decoded);
  } catch (e) {
    console.log('[UI][dashboard] jwt decode hatası:', (e as any)?.message || String(e));
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/codes" className="block rounded-lg border bg-white p-4 hover:shadow">Codes</a>
        <a href="/apply" className="block rounded-lg border bg-white p-4 hover:shadow">Apply</a>
        <a href="/balance" className="block rounded-lg border bg-white p-4 hover:shadow">Balance</a>
      </section>
      <div>
        <a href="/logout" className="text-sm text-red-600 hover:text-red-700">Çıkış Yap</a>
      </div>
    </main>
  );
}