/* Kısa açıklama: Admin Login sayfası — email ve şifre ile giriş formu gönderir, backend yanıtına göre yönlendirir. */
'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Bu sayfa yönetim paneli girişi içindir → admin proxy'ine gönder.
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      // Login sonrası yönlendirme stratejisi: /admin/dashboard
      if (res.redirected) {
        // Sunucu 302 verdiyse admin dashboard'a sabit yönlendir
        window.location.href = '/admin/dashboard';
        return;
      }

      if (res.ok) {
        // 200 OK ise cookie set edilmiş kabul edip admin dashboard'a yönlendir
        window.location.href = '/admin/dashboard';
        return;
      }

      // Hata durumu
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Yönetim Paneline Giriş</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Gönderiliyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}