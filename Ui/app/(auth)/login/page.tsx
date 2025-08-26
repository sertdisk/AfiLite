'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const redirectPath = '/influencer/dashboard'; // Influencer dashboard'a yönlendirme

    try {
      const res = await fetch('/api/auth/login', { // Influencer login endpoint'i
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (res.redirected) {
        window.location.href = redirectPath;
        return;
      }

      if (res.ok) {
        window.location.href = redirectPath;
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="relative w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 backdrop-filter backdrop-blur-lg bg-opacity-70 border border-gray-700 animate-fade-in">
        {/* Logo Animasyonu (Basit bir placeholder) */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-3xl font-bold animate-bounce-slow">
            A
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Influencer Girişi
        </h1>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300" htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-white transition duration-300"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="influencer@domain.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300" htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-white transition duration-300"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? 'Giriş Yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
          <Link href="/influencer/apply" className="text-purple-400 hover:underline font-medium transition duration-300 block">
            Hesabın yok mu? Kaydol
          </Link>
          <Link href="/forgot-password" className="text-gray-400 hover:underline font-medium transition duration-300 block">
            Şifremi Unuttum
          </Link>
        </div>
      </div>
    </div>
  );
}
