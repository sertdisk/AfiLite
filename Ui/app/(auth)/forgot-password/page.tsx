'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', { // Backend'deki yeni endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setMessage('Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Şifre sıfırlama isteği başarısız oldu. Lütfen e-posta adresinizi kontrol edin.');
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="relative w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 backdrop-filter backdrop-blur-lg bg-opacity-70 border border-gray-700 animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Şifremi Unuttum
        </h1>

        {message && (
          <div className="text-sm text-green-400 bg-green-900 bg-opacity-30 p-3 rounded-lg border border-green-700 mb-4">{message}</div>
        )}
        {error && (
          <div className="text-sm text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700 mb-4">{error}</div>
        )}

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
              placeholder="e-posta adresiniz"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? 'Gönderiliyor…' : 'Şifre Sıfırlama Linki Gönder'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/login" className="text-purple-400 hover:underline font-medium transition duration-300">
            Giriş sayfasına geri dön
          </Link>
        </div>
      </div>
    </div>
  );
}