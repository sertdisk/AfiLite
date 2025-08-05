/* Açıklama (TR):
 * Influencer dashboard sayfası — login gerektirir.
 * - getInfluencerSummary ile status, created_at ve days_since_application bilgilerini alır.
 * - Minimalist "SummaryCards" bileşeni ile gösterir.
 * - 401/403 durumunda login sayfasına yönlendirir.
 */
import React from 'react';
import { redirect } from 'next/navigation';
import { ApiError, getInfluencerSummary } from '@/lib/api';
import SummaryCards from '../_components/SummaryCards';

export default async function InfluencerDashboardPage() {
  try {
    const summary = await getInfluencerSummary();
    if (!summary) {
      // JWT yok ya da 401/403
      redirect('/login');
    }

    return (
      <div className="py-8 bg-app text-app">
        {/* Küçük başlık animasyonu (opacity/translate-y) */}
        <h1 className="text-2xl font-semibold tracking-tight mb-4 transition-opacity duration-500 ease-out will-change-transform">
          <span className="bg-clip-text text-transparent gradient-brand">Dashboard</span>
        </h1>

        <SummaryCards summary={summary!} />
      </div>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login');
    }
    // Diğer hatalarda sade bir mesaj ver
    return (
      <div className="py-8 bg-app text-app">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">
          <span className="bg-clip-text text-transparent gradient-brand">Dashboard</span>
        </h1>
        <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
          <p className="text-sm text-muted">
            Özet yüklenemedi. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }
}