'use client';
/* /admin/sales — Satışlar (liste + filtre + CSV/XLSX export)
   Varsayılan proxy uçları:
   - Liste: GET /api/sales?q=&code=&influencerId=&status=&channel=&from=&to=&page=&limit=
   - Export: GET /api/sales/export?format=csv|xlsx&... (filtre parametreleriyle)
*/
import React, { useEffect, useMemo, useState } from 'react';

type SaleRow = {
  id: number;
  code: string;
  influencer_id?: number;
  influencer_name?: string;
  influencer_email?: string;
  channel?: string;
  status?: 'completed' | 'refunded' | string;
  amount?: number;
  commission_amount?: number;
  created_at?: string;
};

export default function AdminSalesPage() {
  // Filtreler
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [influencerId, setInfluencerId] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [from, setFrom] = useState(''); // datetime-local
  const [to, setTo] = useState('');

  // Liste durumu
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (code.trim()) qs.set('code', code.trim());
      if (influencerId.trim()) qs.set('influencerId', influencerId.trim());
      if (status) qs.set('status', status);
      if (channel) qs.set('channel', channel);
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) qs.set('from', d.toISOString());
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) qs.set('to', d.toISOString());
      }
      qs.set('page', String(page));
      qs.set('limit', String(limit));

      const res = await fetch(`/api/sales?${qs.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Satış listesi alınamadı');
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const list: SaleRow[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.sales || []);
      setRows((list || []).map((r: any) => ({
        id: Number(r?.id),
        code: String(r?.code || ''),
        influencer_id: r?.influencer_id,
        influencer_name: r?.influencer_name,
        influencer_email: r?.influencer_email,
        status: r?.status,
        channel: r?.channel,
        amount: Number(r?.amount ?? r?.package_amount),
        commission_amount: Number(r?.commission_amount ?? r?.commission),
        created_at: r?.created_at
      })));
      setTotal(Number.isFinite(json?.total) ? Number(json.total) : null);
    } catch (e: any) {
      setError(e?.message || 'Listeleme başarısız.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { fetchList(); }, []);
  useEffect(() => { fetchList(); }, [page, limit]);

  function onApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }

  const pages = useMemo(() => {
    if (!total || total <= 0) return null;
    return Math.ceil(total / limit);
  }, [total, limit]);

  async function exportFile(format: 'csv' | 'xlsx') {
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (code.trim()) qs.set('code', code.trim());
      if (influencerId.trim()) qs.set('influencerId', influencerId.trim());
      if (status) qs.set('status', status);
      if (channel) qs.set('channel', channel);
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) qs.set('from', d.toISOString());
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) qs.set('to', d.toISOString());
      }
      qs.set('format', format);
      const url = `/api/sales/export?${qs.toString()}`;
      const res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) {
        // sessiz geç
        return;
      }
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || `sales.${format}`;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // sessiz geç
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Satışlar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportFile('csv')} className="rounded-md border px-3 py-2 text-sm hover:bg-white/10">CSV Dışa Aktar</button>
          <button onClick={() => exportFile('xlsx')} className="rounded-md border px-3 py-2 text-sm hover:bg-white/10">Excel (XLSX) Dışa Aktar</button>
        </div>
      </div>

      {/* Filtreler */}
      <form onSubmit={onApplyFilters} className="rounded-md border card-like p-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-sm text-muted mb-1">Ara</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri/kod/yorum" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Kod</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Örn: AHMET15" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Influencer ID</label>
          <input value={influencerId} onChange={(e) => setInfluencerId(e.target.value)} type="number" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Durum</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border px-3 py-2">
            <option value="">— Hepsi —</option>
            <option value="completed">Tamamlandı</option>
            <option value="refunded">İade</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Kanal</label>
          <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Örn: web, ig, yt" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Başlangıç</label>
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="datetime-local" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Bitiş</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} type="datetime-local" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Uygula</button>
          <button type="button" onClick={() => { setQ(''); setCode(''); setInfluencerId(''); setStatus(''); setChannel(''); setFrom(''); setTo(''); setPage(1); fetchList(); }} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </form>

      {/* Hata */}
      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

      {/* Liste */}
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Kod</th>
              <th className="px-4 py-2 text-left">Influencer</th>
              <th className="px-4 py-2 text-left">Kanal</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Tutar</th>
              <th className="px-4 py-2 text-left">Komisyon</th>
              <th className="px-4 py-2 text-left">Oluşturma</th>
              <th className="px-4 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {busy ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">Sonuç yok</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2 font-mono">{r.code}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{r.influencer_name || '-'}</span>
                    <span className="text-xs text-gray-500">{r.influencer_email || ''}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{r.channel || '—'}</td>
                <td className="px-4 py-2">
                  {r.status === 'completed' && <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Tamamlandı</span>}
                  {r.status === 'refunded' && <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">İade</span>}
                  {!['completed', 'refunded'].includes(String(r.status || '')) && <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">{r.status || '—'}</span>}
                </td>
                <td className="px-4 py-2">{Number.isFinite(r.amount) ? Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(r.amount!) : '—'}</td>
                <td className="px-4 py-2">{Number.isFinite(r.commission_amount) ? Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(r.commission_amount!) : '—'}</td>
                <td className="px-4 py-2 text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">
                  <a href={`/admin/sales/${r.id}`} className="text-blue-600 hover:text-blue-800">Detay</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Basit sayfalama */}
      {pages && pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div>Toplam sayfa: {pages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1 disabled:opacity-50">Önceki</button>
            <span>Sayfa {page}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="rounded-md border px-3 py-1 disabled:opacity-50">Sonraki</button>
          </div>
        </div>
      )}
    </main>
  );
}