'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Şifre sıfırlama token\'ı bulunamadı.');
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    if (!token) {
      setError('Şifre sıfırlama token\'ı eksik.');
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', { // Backend'deki yeni endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      if (res.ok) {
        setMessage('Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz.');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Şifre sıfırlama başarısız oldu.');
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
          Şifreyi Sıfırla
        </h1>

        {message && (
          <div className="text-sm text-green-400 bg-green-900 bg-opacity-30 p-3 rounded-lg border border-green-700 mb-4">{message}</div>
        )}
        {error && (
          <div className="text-sm text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700 mb-4">{error}</div>
        )}

        {!token ? (
          <div className="text-center text-gray-400">Geçersiz veya eksik şifre sıfırlama linki.</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300" htmlFor="newPassword">Yeni Şifre</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-white transition duration-300"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Yeni şifreniz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300" htmlFor="confirmPassword">Şifreyi Onayla</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 text-white transition duration-300"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Sıfırlanıyor…' : 'Şifreyi Sıfırla'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/login" className="text-purple-400 hover:underline font-medium transition duration-300">
            Giriş sayfasına geri dön
          </Link>
        </div>
      </div>
    </div>
  );
}