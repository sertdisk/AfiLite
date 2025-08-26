'use client';
/* /admin/payouts — Ödemeler (liste + filtre + CSV/XLSX export + manuel oluşturma + durum güncelleme)
   Proxy varsayımları:
   - Liste: GET /api/payouts?status=&influencerId=&from=&to=&page=&limit=
   - Oluştur: POST /api/payouts { influencerId, amount, iban, note?, status? }
   - Güncelle: PATCH /api/payouts/:id { status }
   - Export: GET /api/payouts/export?format=csv|xlsx&...(filtrelerle)
*/
import React, { useEffect, useMemo, useState } from 'react';

type PayoutRow = {
  id: number;
  influencer_id: number;
  influencer_name?: string;
  influencer_email?: string;
  amount: number;
  currency?: string;
  iban?: string;
  note?: string;
  status: 'pending' | 'sent' | 'completed' | string;
  created_at?: string;
  updated_at?: string;
};

export default function AdminPayoutsPage() {
  // Filtreler
  const [influencerId, setInfluencerId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(''); // datetime-local
  const [to, setTo] = useState('');

  // Liste durumu
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  // Manuel ödeme formu
  const [mInfluencerId, setMInfluencerId] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mIban, setMIban] = useState('');
  const [mNote, setMNote] = useState('');
  const [mStatus, setMStatus] = useState<'pending' | 'sent' | 'completed'>('pending');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (influencerId.trim()) qs.set('influencerId', influencerId.trim());
      if (status) qs.set('status', status);
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
      const res = await fetch(`/api/payouts?${qs.toString()}`, { credentials: 'include', cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Ödeme listesi alınamadı');
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const list: any[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.payouts || []);
      setRows((list || []).map((r: any) => ({
        id: Number(r?.id),
        influencer_id: Number(r?.influencer_id),
        influencer_name: r?.influencer_name,
        influencer_email: r?.influencer_email,
        amount: Number(r?.amount ?? 0),
        currency: r?.currency || 'TRY',
        iban: r?.iban,
        status: r?.status || 'pending',
        note: r?.note,
        created_at: r?.created_at,
        updated_at: r?.updated_at,
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
      if (influencerId.trim()) qs.set('influencerId', influencerId.trim());
      if (status) qs.set('status', status);
      if (from) { const d = new Date(from); if (!isNaN(d.getTime())) qs.set('from', d.toISOString()); }
      if (to) { const d = new Date(to); if (!isNaN(d.getTime())) qs.set('to', d.toISOString()); }
      qs.set('format', format);
      const url = `/api/payouts/export?${qs.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || `payouts.${format}`;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  }

  async function createPayout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateErr(null);
    setCreateMsg(null);
    const idNum = Number(mInfluencerId);
    const amountNum = Number(mAmount);
    if (!idNum || idNum <= 0) { setCreateErr('Geçerli bir influencerId girin.'); return; }
    if (!Number.isFinite(amountNum) || amountNum <= 0) { setCreateErr('Geçerli bir tutar girin.'); return; }
    if (!mIban.trim()) { setCreateErr('IBAN zorunludur.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          influencerId: idNum,
          amount: amountNum,
          iban: mIban.trim(),
          note: mNote.trim() || undefined,
          status: mStatus || 'pending'
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        setCreateErr(msg || 'Ödeme oluşturma başarısız.');
        return;
      }
      setCreateMsg('Ödeme oluşturuldu.');
      setMInfluencerId(''); setMAmount(''); setMIban(''); setMNote(''); setMStatus('pending');
      fetchList();
    } catch {
      setCreateErr('Beklenmeyen bir hata oluştu.');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(row: PayoutRow, next: 'pending' | 'sent' | 'completed') {
    try {
      const res = await fetch(`/api/payouts/${encodeURIComponent(String(row.id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        alert(msg || 'Durum güncelleme başarısız.');
        return;
      }
      fetchList();
    } catch {
      alert('Beklenmeyen bir hata oluştu.');
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ödemeler</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportFile('csv')} className="rounded-md border px-3 py-2 text-sm hover:bg-white/10">CSV Dışa Aktar</button>
          <button onClick={() => exportFile('xlsx')} className="rounded-md border px-3 py-2 text-sm hover:bg-white/10">Excel (XLSX) Dışa Aktar</button>
        </div>
      </div>

      {/* Filtreler */}
      <form onSubmit={onApplyFilters} className="rounded-md border card-like p-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-sm text-muted mb-1">Influencer ID</label>
          <input value={influencerId} onChange={(e) => setInfluencerId(e.target.value)} type="number" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Durum</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border px-3 py-2">
            <option value="">— Hepsi —</option>
            <option value="pending">Bekliyor</option>
            <option value="sent">Gönderildi</option>
            <option value="completed">Tamamlandı</option>
          </select>
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
          <button type="button" onClick={() => { setInfluencerId(''); setStatus(''); setFrom(''); setTo(''); setPage(1); fetchList(); }} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </form>

      {/* Manuel Ödeme Oluştur */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Manuel Ödeme Oluştur</h2>
        <form onSubmit={createPayout} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-muted mb-1">Influencer ID</label>
            <input value={mInfluencerId} onChange={(e) => setMInfluencerId(e.target.value)} type="number" className="w-full rounded-md border px-3 py-2" required min={1} />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Tutar</label>
            <input value={mAmount} onChange={(e) => setMAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full rounded-md border px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">IBAN</label>
            <input value={mIban} onChange={(e) => setMIban(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="TR.." required />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm text-muted mb-1">Not (opsiyonel)</label>
            <textarea value={mNote} onChange={(e) => setMNote(e.target.value)} className="w-full rounded-md border px-3 py-2" rows={2} placeholder="Açıklama (opsiyonel)" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Durum</label>
            <select value={mStatus} onChange={(e) => setMStatus(e.target.value as any)} className="w-full rounded-md border px-3 py-2">
              <option value="pending">Bekliyor</option>
              <option value="sent">Gönderildi</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-3">
            {createErr && <span className="text-sm text-red-500">{createErr}</span>}
            {createMsg && <span className="text-sm text-emerald-500">{createMsg}</span>}
            <button type="submit" disabled={creating} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60">
              {creating ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </section>

      {/* Liste */}
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Influencer</th>
              <th className="px-4 py-2 text-left">Tutar</th>
              <th className="px-4 py-2 text-left">IBAN</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-left">Oluşturma</th>
              <th className="px-4 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {busy ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Sonuç yok</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{r.influencer_name || '-'}</span>
                    <span className="text-xs text-gray-500">{r.influencer_email || ''} · #{r.influencer_id}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  {Number.isFinite(r.amount) ? Intl.NumberFormat('tr-TR', { style: 'currency', currency: r.currency || 'TRY' }).format(r.amount!) : '—'}
                </td>
                <td className="px-4 py-2 font-mono">{r.iban || '—'}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' && <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Bekliyor</span>}
                    {r.status === 'sent' && <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Gönderildi</span>}
                    {r.status === 'completed' && <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Tamamlandı</span>}
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateStatus(r, 'pending')} className="rounded border px-2 py-0.5 text-[11px]">Bekliyor</button>
                      <button onClick={() => updateStatus(r, 'sent')} className="rounded border px-2 py-0.5 text-[11px]">Gönderildi</button>
                      <button onClick={() => updateStatus(r, 'completed')} className="rounded border px-2 py-0.5 text-[11px]">Tamamlandı</button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">
                  <span className="text-xs text-gray-500">{r.note || ''}</span>
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