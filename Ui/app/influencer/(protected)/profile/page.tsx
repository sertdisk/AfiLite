/* Açıklama (TR):
 * Influencer profil sayfası — login gerektirir.
 * - getInfluencerMe ile mevcut değerler çekilir ve ProfileForm bileşeni ile düzenlenir.
 * - 401/403 durumda login sayfasına yönlendirilir.
 * - Dark/glass kart, minimal başlık animasyonu ve erişilebilir formlar.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { ApiError, getInfluencerMe, getInfluencerSummary } from '@/lib/api';
import ProfileForm from '../_components/ProfileForm';

export default function InfluencerProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [summary, setSummary] = useState<{ status: string; created_at: string; days_since_application: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getInfluencerMe();
        if (!userData) {
          redirect('/login');
        }
        setMe(userData);

        // Başvuru durumu özetini çek
        const summaryData = await getInfluencerSummary();
        setSummary(summaryData);
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404)) {
          redirect('/login');
        }
        setError('Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="py-8 bg-app text-app">
      {/* Küçük başlık animasyonu (opacity/translate-y) */}
      <h1 className="text-2xl font-semibold tracking-tight mb-4 transition-opacity duration-500 ease-out will-change-transform">
        <span className="bg-clip-text text-transparent gradient-brand">Profil</span>
      </h1>

      {/* Başvuru Durumu Section */}
      {summary && (
        <section id="application-status-section" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Başvuru Durumu</div>
            <div className="text-xl font-semibold text-white">{summary.status}</div>
          </div>
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Başvuru Tarihi</div>
            <div className="text-xl font-semibold text-white">
              {summary.created_at ? new Date(summary.created_at).toLocaleDateString('tr-TR') : '—'}
            </div>
          </div>
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Gün</div>
            <div className="text-xl font-semibold text-white">{summary.days_since_application}</div>
          </div>
        </section>
      )}

      {me && (
        <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
          {/* Açıklama: Mevcut değerler ProfileForm'a aktarılır */}
          <ProfileForm initial={me} platformMessage={me?.platformMessage} />
        </div>
      )}
    </div>
  );
}