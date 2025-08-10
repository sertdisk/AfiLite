/* /admin/influencers — Influencerlar (liste + filtre) */
'use client';

import React, { useEffect, useMemo, useState } from 'react';

function BalanceCell({ influencerId }: { influencerId: number }) {
  const [val, setVal] = useState<string>('—');
  useEffect(() => {
    let abort = false;
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/balance/${encodeURIComponent(String(influencerId))}/summary`, {
          credentials: 'include',
          cache: 'no-store'
        });
        const text = await res.text();
        if (!res.ok) return;
        const j = JSON.parse(text || '{}');
        if (!abort) {
          const balance = Number(j?.balance ?? j?.total_balance ?? 0);
          setVal(new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance));
        }
      } catch {
        if (!abort) setVal('—');
      }
    }
    fetchSummary();
    return () => { abort = true; };
  }, [influencerId]);
  return <span className="font-medium text-gray-800">{val}</span>;
}

type InfluencerRow = {
  id: number;
  name: string;
  email: string;
  social_handle: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  codes?: string[];
  created_at?: string;
};

type Paged<T> = { items: T[]; total?: number; page?: number; limit?: number };

export default function AdminInfluencersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>(''); // '', 'pending', 'approved', 'rejected', 'suspended'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InfluencerRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));
      // Önce admin UI proxy’sini dene
      let res = await fetch(`/api/influencers?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      // Eğer proxy route bulunamadıysa (404 Not Found) doğrudan backend’e düş (geçici fallback)
      if (res.status === 404) {
        const origin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || (typeof window !== 'undefined' ? (window as any).__BACKEND_ORIGIN__ : '') || '';
        const base = origin || '';
        if (base) {
          res = await fetch(`${base.replace(/\/$/, '')}/api/v1/influencers?${params.toString()}`, {
            cache: 'no-store',
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
        }
      }
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        // Debug: konsola durum ve header bilgisini not düş
        if (typeof window !== 'undefined') {
          console.warn('Admin influencers list fetch failed', { status: res.status, body: text });
        }
        throw new Error(msg || (res.status === 404 ? 'Endpoint not found' : 'Listeleme hatası'));
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const list: InfluencerRow[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.influencers || []);
      setRows((list || []).map((r: any) => ({
        id: Number(r?.id),
        name: String(r?.name || ''),
        email: String(r?.email || ''),
        social_handle: String(r?.social_handle || ''),
        status: (r?.status || 'approved') as any,
        codes: Array.isArray(r?.codes) ? r.codes : [],
        created_at: r?.created_at
      })));
      setTotal(Number.isFinite(json?.total) ? Number(json.total) : null);
    } catch (e: any) {
      setError(e?.message || 'Listeleme başarısız.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { fetchList(); /* ilk yük */ }, []);
  useEffect(() => { fetchList(); /* filtre/değişim */ }, [page, limit]);

  function onApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }

  const pages = useMemo(() => {
    if (!total || total <= 0) return null;
    return Math.ceil(total / limit);
  }, [total, limit]);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Influencerlar</h1>
        <a href="/admin/codes" className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">Kodlar</a>
      </div>

      {/* Filtreler */}
      <form onSubmit={onApplyFilters} className="rounded-md border card-like p-4 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="block text-sm text-muted mb-1">Ara (isim, e‑posta, hesap adı)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Örn: ahmet, ahmet@..., @ahmet"
            className="w-full rounded-md border px-3 py-2"
          />
          {/* Endpoint not found uyarısı için yardımcı not */}
          <p className="mt-1 text-[11px] text-muted">
            Arama çalışmıyorsa, backend’te GET /api/v1/influencers uç noktası aktif olmalı ve admin-ui tarafında /api/influencers proxy’i mevcut olmalıdır.
          </p>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Durum</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">— Hepsi —</option>
            <option value="approved">Aktif (approved)</option>
            <option value="pending">Beklemede (pending)</option>
            <option value="rejected">Reddedildi (rejected)</option>
            <option value="suspended">Askıda (suspended)</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Uygula</button>
          <button type="button" onClick={() => { setQ(''); setStatus(''); setPage(1); fetchList(); }} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </form>

      {/* Hata */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
          {String(error).toLowerCase().includes('admin yetkisi gerekli') && (
            <div className="mt-2 text-xs text-red-600">
              Oturum yetkiniz backend tarafından doğrulanamadı. Lütfen admin olarak tekrar giriş yapın.
              <a href="/login" className="ml-2 underline">Giriş</a>
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      {!error && (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Ad Soyad</th>
                <th className="px-4 py-2 text-left">E‑posta</th>
                <th className="px-4 py-2 text-left">Hesap Adı</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-left">Bakiye</th>
                <th className="px-4 py-2 text-left">Kodlar</th>
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
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">@{r.social_handle}</td>
                  <td className="px-4 py-2">
                    {r.status === 'approved' && <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>}
                    {r.status === 'pending' && <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Beklemede</span>}
                    {r.status === 'rejected' && <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Reddedildi</span>}
                    {r.status === 'suspended' && <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Askıda</span>}
                  </td>
                  <td className="px-4 py-2">
                    <BalanceCell influencerId={r.id} />
                  </td>
                  <td className="px-4 py-2">{(r.codes && r.codes.length) ? r.codes.join(', ') : '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    <a href={`/admin/influencers/${r.id}`} className="text-blue-600 hover:text-blue-800">Detay</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basit sayfalama (total varsa) */}
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