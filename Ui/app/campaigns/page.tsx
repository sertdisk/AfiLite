'use client';

import { useEffect, useMemo, useState } from 'react';

type CampaignRow = {
  id: number | string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  rate_percent?: number | null; // kampanya komisyon oranı
  note?: string | null;
  created_at?: string;
};

type ListResponse =
  | { campaigns: CampaignRow[]; total?: number; page?: number; limit?: number }
  | CampaignRow[];

export default function CampaignsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form (taslak)
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState<string>('');
  const [newStart, setNewStart] = useState<string>(''); // YYYY-MM-DD
  const [newEnd, setNewEnd] = useState<string>('');
  const [newRate, setNewRate] = useState<number>(10);
  const [newNote, setNewNote] = useState<string>('');
  const [createMsg, setCreateMsg] = useState<string | null>(null);

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

      const res = await fetch(`/api/campaigns?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: ctrl?.signal,
      });

      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const maybe = JSON.parse(text || '{}'); msg = maybe?.message || maybe?.error || msg; } catch {}
        setError(msg || 'Kampanyalar alınamadı.');
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
        setRows((json as any).campaigns || []);
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

  function isValidDateStr(s: string): boolean {
    if (!s) return true;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }

  async function onCreateCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateMsg(null);
    setError(null);

    if (!newName || newName.trim().length < 2) {
      setError('İsim en az 2 karakter olmalıdır.');
      return;
    }
    if (newRate < 0 || newRate > 100) {
      setError('Oran 0-100 arasında olmalıdır.');
      return;
    }
    if (!isValidDateStr(newStart) || !isValidDateStr(newEnd)) {
      setError('Tarih formatı hatalı (YYYY-MM-DD).');
      return;
    }
    if (newStart && newEnd) {
      const sd = new Date(newStart);
      const ed = new Date(newEnd);
      if (ed.getTime() < sd.getTime()) {
        setError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
        return;
      }
    }

    setCreating(true);
    try {
      const payload: any = {
        name: newName.trim(),
        rate_percent: Number(newRate),
        note: newNote || undefined,
      };
      if (newStart) payload.start_date = newStart;
      if (newEnd) payload.end_date = newEnd;

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const maybe = JSON.parse(text || '{}'); msg = maybe?.message || maybe?.error || msg; } catch {}
        setError(msg || 'Kampanya oluşturulamadı.');
        return;
      }
      setCreateMsg('Kampanya oluşturuldu.');
      // listeyi tazele
      const ctrl = new AbortController();
      await fetchList(ctrl);
      setNewName('');
      setNewStart('');
      setNewEnd('');
      setNewRate(10);
      setNewNote('');
    } catch {
      setError('Beklenmeyen bir hata oluştu (oluşturma).');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kampanyalar</h1>
        <a href="/commissions" className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black">
          Komisyon Politikaları
        </a>
      </div>

      {/* Filtreler */}
      <form onSubmit={onApplyFilters} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex flex-col">
          <label htmlFor="q" className="text-sm mb-1">Arama</label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim/not içinde ara"
            className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <button type="submit" className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm hover:bg-black">
          Uygula
        </button>
      </form>

      {/* Hızlı Ekleme Formu */}
      <form onSubmit={onCreateCampaign} className="space-y-4 rounded-md border bg-white p-4">
        <div className="font-medium">Yeni Kampanya</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm mb-1 block">İsim</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Yaz indirimi"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="text-sm mb-1 block">Başlangıç</label>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm mb-1 block">Bitiş</label>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm mb-1 block">Oran (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={newRate}
              onChange={(e) => setNewRate(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-5">
            <label className="text-sm mb-1 block">Not</label>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Opsiyonel açıklama"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        {createMsg && <div className="text-sm text-green-600">{createMsg}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </form>

      {/* Liste */}
      <div className="border rounded-md overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">İsim</th>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">Oran (%)</th>
              <th className="px-3 py-2">Not</th>
              <th className="px-3 py-2">Oluşturulma</th>
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
              <tr key={String(r.id)} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">
                  {(r.start_date ? new Date(r.start_date).toLocaleDateString() : '—')} - {(r.end_date ? new Date(r.end_date).toLocaleDateString() : '—')}
                </td>
                <td className="px-3 py-2">{r.rate_percent != null ? Number(r.rate_percent).toFixed(2) : '—'}</td>
                <td className="px-3 py-2">{r.note || '—'}</td>
                <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
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