'use client';

import { useEffect, useMemo, useState } from 'react';

type SaleRow = {
  id: number;
  code: string;
  influencer_id: number;
  total_amount: number;
  commission?: number;
  created_at?: string;
};

type ListResponse =
  | { sales: SaleRow[]; total?: number; page?: number; limit?: number }
  | SaleRow[];

export default function SalesListPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (total == null) return null;
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  async function fetchList(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/sales?${params.toString()}`, {
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
        setError(msg || 'Satış listesi alınamadı.');
        setRows([]);
        setTotal(null);
        return;
      }

      let json: ListResponse = [];
      try { json = JSON.parse(text || '[]'); } catch { json = []; }

      if (Array.isArray(json)) {
        setRows(json || []);
        setTotal(null);
      } else {
        setRows((json as any).sales || []);
        setTotal(typeof (json as any).total === 'number' ? (json as any).total : null);
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setError('Beklenmeyen bir hata oluştu.');
        setRows([]);
        setTotal(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchList(ctrl);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, limit]);

  function onApplyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Satışlar</h1>
        <a
          href="/sales/stats"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          İstatistikler
        </a>
      </div>

      <form onSubmit={onApplyFilters} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex flex-col">
          <label htmlFor="q" className="text-sm mb-1">Arama</label>
          <input
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kod / Influencer ID"
            className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <button type="submit" className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm hover:bg-black">
          Uygula
        </button>
      </form>

      <div className="border rounded-md overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Influencer</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={7}>Yükleniyor…</td></tr>
            )}
            {!loading && error && (
              <tr><td className="px-3 py-3 text-red-600" colSpan={7}>{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={7}>Kayıt bulunamadı</td></tr>
            )}
            {!loading && !error && rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.code}</td>
                <td className="px-3 py-2">{r.influencer_id}</td>
                <td className="px-3 py-2">{typeof r.total_amount === 'number' ? r.total_amount.toFixed(2) : r.total_amount}</td>
                <td className="px-3 py-2">{r.commission != null ? Number(r.commission).toFixed(2) : '—'}</td>
                <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <a href={`/sales/${r.id}`} className="text-blue-600 hover:text-blue-800">Detay</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {total != null ? `Toplam: ${total}` : rows.length > 0 ? `Kayıt: ${rows.length}` : ''}
        </div>
        {totalPages && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {'<'} Önceki
            </button>
            <span className="text-sm">Sayfa {page}/{totalPages}</span>
            <button
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Sonraki {'>'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}