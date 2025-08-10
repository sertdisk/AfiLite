/* Admin segment layout: /admin/* altında tüm admin sayfaları için kapsayıcı. */
import React from 'react';
import { cookies } from 'next/headers';

/**
 * Sunucu tarafı admin guard:
 * - admin_jwt, jwt veya access_token cookie'sinden en az birinin varlığını kontrol eder.
 * - Yoksa 401 döndürür ve basit bir uyarı render eder.
 * Not: Asıl token doğrulaması backend tarafından yapılır; burada sadece korumalı alan için minimum gating yapılır.
 */
function hasAnyAuthCookie() {
  const adminJwt = cookies().get('admin_jwt')?.value;
  const jwt = cookies().get('jwt')?.value;
  const access = cookies().get('access_token')?.value;
  return Boolean(adminJwt || jwt || access);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = hasAnyAuthCookie();
  if (!ok) {
    // 401 mesajı — kullanıcıyı login akışına yönlendirmek için link veriyoruz
    return (
      <main className="p-6">
        <div className="mx-auto max-w-xl rounded-md border bg-white p-6">
          <h1 className="text-xl font-semibold mb-2">Admin yetkisi gerekli</h1>
          <p className="text-sm text-gray-600 mb-4">
            Bu alanı görüntülemek için admin olarak oturum açmalısınız.
          </p>
          <a href="/admin/login" className="inline-block rounded-md bg-[#0f172a] px-4 py-2 text-white text-sm">Giriş yap</a>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}