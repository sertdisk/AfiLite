/* Açıklama (TR):
 * Minimal "SummaryCards" bileşeni — Influencer özet verilerini küçük kartlar halinde gösterir.
 * - Glassmorphism: bg-white/5, backdrop-blur, border-white/10
 * - Mikro etkileşim: hover ve focus ile yumuşak geçişler
 * - Erişilebilir: semantik başlıklar ve okunabilir tipografi
 */
import React from 'react';
import { InfluencerSummary } from '@/lib/api';

export default function SummaryCards({ summary }: { summary: InfluencerSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-app bg-panel p-4 text-app shadow card-hover">
        <p className="text-xs text-muted">Durum</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{mapStatus(summary.status)}</p>
      </div>

      <div className="rounded-xl border border-app bg-panel p-4 text-app shadow card-hover">
        <p className="text-xs text-muted">Başvuru Tarihi</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{new Date(summary.created_at).toLocaleString()}</p>
      </div>

      <div className="rounded-xl border border-app bg-panel p-4 text-app shadow card-hover">
        <p className="text-xs text-muted">Gün Sayısı</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{summary.days_since_application}</p>
      </div>
    </div>
  );
}

function mapStatus(s: InfluencerSummary['status']) {
  switch (s) {
    case 'pending':
      return 'Beklemede';
    case 'approved':
      return 'Onaylandı';
    case 'rejected':
      return 'Reddedildi';
    default:
      return s;
  }
}