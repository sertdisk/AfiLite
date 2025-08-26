'use client';

import { useEffect, useState } from 'react';

type SalesStats = {
  total_sales: number;
  total_revenue: number;
  total_commission: number;
  average_order_value: number;
};

export default function SalesStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sales/stats', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: ctrl?.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'İstatistikler alınamadı.');
        setStats(null);
        return;
      }

      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }

      const s: SalesStats = (json?.stats ?? json) as SalesStats;
      setStats(s || null);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setError('Beklenmeyen bir hata oluştu.');
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchStats(ctrl);
    return () => ctrl.abort();
  }, []);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Satış İstatistikleri</h1>
        <a href="/sales" className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black">
          Satış Listesi
        </a>
      </div>

      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && stats && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-md border p-4 bg-white">
              <div className="text-xs text-gray-500">Toplam Satış</div>
              <div className="text-2xl font-semibold">{Number(stats.total_sales ?? 0).toLocaleString()}</div>
            </div>
            <div className="rounded-md border p-4 bg-white">
              <div className="text-xs text-gray-500">Toplam Gelir</div>
              <div className="text-2xl font-semibold">{Number(stats.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="rounded-md border p-4 bg-white">
              <div className="text-xs text-gray-500">Toplam Komisyon</div>
              <div className="text-2xl font-semibold">{Number(stats.total_commission ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="rounded-md border p-4 bg-white">
              <div className="text-xs text-gray-500">AOV</div>
              <div className="text-2xl font-semibold">{Number(stats.average_order_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </section>

          <section className="text-sm text-gray-600">
            Bu değerler /api/v1/sales/stats üzerinden hesaplanan anlık özet göstergelerdir.
          </section>
        </>
      )}
    </main>
  );
}