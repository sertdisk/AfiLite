'use client';

import { useEffect, useMemo, useState } from 'react';

type Applicant = {
  id: number;
  name: string;
  email: string;
  social_handle?: string;
  status?: string;
  created_at?: string;
};

type ListResponse =
  | { influencers: Applicant[]; total?: number; page?: number; limit?: number }
  | Applicant[];

export default function ApplicationsPage() {
  // Varsayılan pending filtresi
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Applicant[]>([]);
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
      params.set('status', 'pending');
      if (q) params.set('q', q);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/influencers?${params.toString()}`, {
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
        setError(msg || 'Başvuru listesi alınamadı.');
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
        setRows(json.influencers || []);
        setTotal(typeof json.total === 'number' ? json.total : null);
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

  async function patchStatus(id: number, status: 'approved' | 'rejected') {
    const ok = window.confirm(`Bu başvuruyu "${status}" yapmak istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        alert(msg || 'İşlem başarısız.');
        return;
      }
      // Başarılı → listeyi tazele
      fetchList();
    } catch {
      alert('Beklenmeyen bir hata oluştu.');
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Başvurular (Pending)</h1>
        <a
          href="/influencers"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Influencer Listesi
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
            placeholder="İsim / Email / Handle"
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
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Handle</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>Yükleniyor…</td></tr>
            )}
            {!loading && error && (
              <tr><td className="px-3 py-3 text-red-600" colSpan={6}>{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>Kayıt bulunamadı</td></tr>
            )}
            {!loading && !error && rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.social_handle || '—'}</td>
                <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 flex flex-wrap gap-2">
                  <a
                    className="text-blue-600 hover:text-blue-800"
                    href={`/influencers/applications/${r.id}`}
                  >
                    İncele
                  </a>
                  <button
                    type="button"
                    onClick={() => patchStatus(r.id, 'approved')}
                    className="rounded-md border px-3 py-1 text-xs hover:bg-green-50"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStatus(r.id, 'rejected')}
                    className="rounded-md border px-3 py-1 text-xs hover:bg-red-50"
                  >
                    Reddet
                  </button>
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