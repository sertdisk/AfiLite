/* Açıklama (TR):
 * Influencer başvuru sayfası — public erişime açıktır.
 * - Login'li kullanıcı için mevcut me kaydı varsa nazikçe /influencer/status sayfasına yönlendirir.
 * - Dark/glass arkaplanlı kart ve minimal tipografi içerir.
 * - Form bileşeni: ApplyForm (client component).
 * - Görsel hiyerarşi: Başlık ortalanmış, açıklama maks. genişlikte; form kartı başlığın altında.
 */
import React from 'react';
import { redirect } from 'next/navigation';
import { getInfluencerMe } from '@/lib/api';
import ApplyForm from '../_components/ApplyForm';

export const dynamic = 'force-dynamic';

export default async function InfluencerApplyPage() {
  // Eğer login'li kullanıcı zaten bir başvuru oluşturmuşsa status sayfasına yönlendir.
  const me = await getInfluencerMe().catch(() => null);
  if (me) {
    redirect('/influencer/status');
  }

  return (
    <div className="bg-app text-app">
      {/* Başlık bloğu */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6 md:pt-16 text-center">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight transition-opacity duration-500 ease-out will-change-transform">
          <span className="bg-clip-text text-transparent gradient-brand">Influencer Başvurusu</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl mx-auto">
          Lütfen aşağıdaki formu eksiksiz doldurun. Onay sonrası e-posta ile bilgilendirileceksiniz.
        </p>
      </div>

      {/* Form kartı */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <div className="rounded-xl border border-app bg-panel p-6 text-app shadow-xl card-hover">
          <ApplyForm />
        </div>
      </div>
    </div>
  );
}