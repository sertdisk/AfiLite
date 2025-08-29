/* Açıklama (TR):
 * Influencer profil sayfası — login gerektirir.
 * - getInfluencerMe ile mevcut değerler çekilir ve ProfileForm bileşeni ile düzenlenir.
 * - 401/403 durumda login sayfasına yönlendirilir.
 * - Dark/glass kart, minimal başlık animasyonu ve erişilebilir formlar.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { ApiError, getInfluencerMe, getInfluencerSummary, getUnreadAlerts, markAlertRead, SystemAlert } from '@/lib/api';
import ProfileForm from '../_components/ProfileForm';

export default function InfluencerProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
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

        // Sistem uyarılarını çek
        const unreadAlerts = await getUnreadAlerts();
        setAlerts(unreadAlerts);

        // Başvuru durumu özetini çek
        const summaryData = await getInfluencerSummary();
        setSummary(summaryData);
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          redirect('/login');
        }
        setError('Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDismissAlert = async (alertId: number) => {
    try {
      // Uyarıyı okundu olarak işaretle
      await markAlertRead(alertId);
      
      // Yerel state'ten kaldır
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error('Uyarı kapatma hatası:', e);
    }
  };

  return (
    <div className="py-8 bg-app text-app">
      {/* Küçük başlık animasyonu (opacity/translate-y) */}
      <h1 className="text-2xl font-semibold tracking-tight mb-4 transition-opacity duration-500 ease-out will-change-transform">
        <span className="bg-clip-text text-transparent gradient-brand">Profil</span>
      </h1>

      {/* Sistem Uyarıları */}
      {alerts.map(alert => (
        <aside key={alert.id} className="p-6 border border-yellow-600 rounded-xl bg-yellow-900/20 text-yellow-100 shadow-xl space-y-4 animate-fade-in mb-6">
          <p className="font-bold text-xl flex items-center text-yellow-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Sistem Uyarısı
          </p>
          <p className="text-base leading-relaxed text-gray-200">{alert.message}</p>
          <button
            onClick={() => handleDismissAlert(alert.id)}
            className="mt-4 px-6 py-2 rounded-lg bg-yellow-700 text-white font-semibold hover:bg-yellow-600 transition-colors duration-300 ease-in-out shadow-md transform hover:scale-105"
          >
            Okudum Anladım
          </button>
        </aside>
      ))}

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