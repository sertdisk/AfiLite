/* Açıklama (TR):
 * Influencer başvuru durumu sayfası — login gerektirir.
 * - getInfluencerMe ile status ve created_at gösterilir.
 * - pending/approved/rejected durumları için küçük rozet (badge) stili.
 * - Başvuru yoksa apply sayfasına yönlendirme bağlantısı gösterilir.
 * - 401 durumunda mevcut pattern: login sayfasına yönlendirilir.
 */
import React from 'react';
import { redirect } from 'next/navigation';
import { ApiError, getInfluencerMe } from '@/lib/api';

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map: Record<typeof status, { text: string; cls: string }> = {
    pending: { text: 'Beklemede', cls: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30' },
    approved: { text: 'Onaylandı', cls: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' },
    rejected: { text: 'Reddedildi', cls: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30' }
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.text}
    </span>
  );
}

export default async function InfluencerStatusPage() {
  let me = null;
  try {
    me = await getInfluencerMe();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login');
    }
    me = null;
  }

  if (!me) {
    return (
      <div className="py-8 bg-app text-app">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">
          <span className="bg-clip-text text-transparent gradient-brand">Başvuru Durumu</span>
        </h1>
        <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
          <p className="text-sm text-muted">
            Henüz bir başvuru bulunamadı. Lütfen <a href="/influencer/apply" className="underline hover:text-app transition">başvuru formunu</a> doldurun.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-app text-app">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        <span className="bg-clip-text text-transparent gradient-brand">Başvuru Durumu</span>
      </h1>

      <div className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Durum</p>
            <div className="mt-1"><StatusBadge status={me.status} /></div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted">Başvuru Tarihi</p>
            <p className="mt-1 text-app">{new Date(me.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted">
          Profiliniz onaylandığında bilgilendirileceksiniz. Bu ekranı daha sonra tekrar kontrol edebilirsiniz.
        </div>
      </div>
    </div>
  );
}