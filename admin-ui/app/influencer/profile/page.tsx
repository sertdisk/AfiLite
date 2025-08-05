/* Açıklama (TR):
 * Influencer profil sayfası — login gerektirir.
 * - getInfluencerMe ile mevcut değerler çekilir ve ProfileForm bileşeni ile düzenlenir.
 * - 401/403 durumda login sayfasına yönlendirilir.
 * - Dark/glass kart, minimal başlık animasyonu ve erişilebilir formlar.
 */
import React from 'react';
import { redirect } from 'next/navigation';
import { ApiError, getInfluencerMe } from '@/lib/api';
import ProfileForm from '../_components/ProfileForm';

export default async function InfluencerProfilePage() {
  try {
    const me = await getInfluencerMe();
    if (!me) {
      // JWT yok veya erişim yok
      redirect('/login');
    }

    return (
      <div className="py-8 bg-app text-app">
        {/* Küçük başlık animasyonu (opacity/translate-y) */}
        <h1 className="text-2xl font-semibold tracking-tight mb-4 transition-opacity duration-500 ease-out will-change-transform">
          <span className="bg-clip-text text-transparent gradient-brand">Profil</span>
        </h1>
  
        <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
          {/* Açıklama: Mevcut değerler ProfileForm'a aktarılır */}
          <ProfileForm initial={me!} />
        </div>
      </div>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login');
    }
    return (
      <div className="py-8 bg-app text-app">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">
          <span className="bg-clip-text text-transparent gradient-brand">Profil</span>
        </h1>
        <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
          <p className="text-sm text-muted">Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      </div>
    );
  }
}