'use client';
/* /admin/commissions — Komisyonlar (liste + filtre + CSV/XLSX export + oluştur/güncelle)
   Proxy varsayımları:
   - Liste:   GET  /api/commissions?influencerId=&code=&active=&page=&limit=
   - Oluştur: POST /api/commissions { influencerId, code?, commission_pct, active }
   - Güncelle:PATCH /api/commissions/:id { commission_pct?, active? }
   - Export:  GET  /api/commissions/export?format=csv|xlsx&...(filtrelerle)
*/
import React, { useEffect, useMemo, useState } from 'react';

type CommissionRow = {
  id: number;
  influencer_id: number;
  influencer_name?: string;
  influencer_email?: string;
  code?: string;
  commission_pct: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function AdminCommissionsPage() {
  // Filtreler
  const [influencerId, setInfluencerId] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState<string>(''); // '', 'true', 'false'

  // Liste state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  // Yeni komisyon formu
  const [nInfluencerId, setNInfluencerId] = useState('');
  const [nCode, setNCode] = useState('');
  const [nPct, setNPct] = useState(40);
  const [nActive, setNActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Inline güncelleme
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ePct, setEPct] = useState<number>(40);
  const [eActive, setEActive] = useState<boolean>(true);
  const [savingEdit, setSavingEdit] = useState(false);

  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (influencerId.trim()) qs.set('influencerId', influencerId.trim());
      if (code.trim()) qs.set('code', code.trim());
      if (active) qs.set('active', active);
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const res = await fetch(`/api/commissions?${qs.toString()}`, { cache: 'no-store', credentials: 'include' });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Komisyon listesi alınamadı');
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const list: any[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.commissions || []);
      setRows((list || []).map((r: any) => ({
        id: Number(r?.id),
        influencer_id: Number(r?.influencer_id),
        influencer_name: r?.influencer_name,
        influencer_email: r?.influencer_email,
        code: r?.code || r?.discount_code || undefined,
        commission_pct: Number(r?.commission_pct ?? r?.commission_rate ?? 0),
        active: !!(r?.active ?? r?.is_active ?? true),
        created_at: r?.created_at,
        updated_at: r?.updated_at
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
      if (code.trim()) qs.set('code', code.trim());
      if (active) qs.set('active', active);
      qs.set('format', format);
      const url = `/api/commissions/export?${qs.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || `commissions.${format}`;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  }

  async function createCommission(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateErr(null);
    setCreateMsg(null);
    const idNum = Number(nInfluencerId);
    const pctNum = Number(nPct);
    if (!idNum || idNum <= 0) { setCreateErr('Geçerli bir influencerId girin.'); return; }
    if (!Number.isFinite(pctNum) || pctNum < 1 || pctNum > 100) { setCreateErr('Komisyon % 1-100 arasında olmalıdır.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          influencerId: idNum,
          code: nCode.trim() || undefined,
          commission_pct: pctNum,
          active: nActive
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        setCreateErr(msg || 'Komisyon ekleme başarısız.');
        return;
      }
      setCreateMsg('Komisyon eklendi.');
      setNInfluencerId(''); setNCode(''); setNPct(40); setNActive(true);
      fetchList();
    } catch {
      setCreateErr('Beklenmeyen bir hata oluştu.');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(r: CommissionRow) {
    setEditingId(r.id);
    setEPct(Number(r.commission_pct || 40));
    setEActive(!!r.active);
  }

  async function saveEdit(r: CommissionRow) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/commissions/${encodeURIComponent(String(r.id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          commission_pct: Number(ePct),
          active: !!eActive
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        alert(msg || 'Komisyon güncelleme başarısız.');
        return;
      }
      setEditingId(null);
      fetchList();
    } catch {
      alert('Beklenmeyen bir hata oluştu.');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Komisyonlar</h1>
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
          <label className="block text-sm text-muted mb-1">Kod</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="İsteğe bağlı kod" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Aktif</label>
          <select value={active} onChange={(e) => setActive(e.target.value)} className="w-full rounded-md border px-3 py-2">
            <option value="">— Hepsi —</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Uygula</button>
          <button type="button" onClick={() => { setInfluencerId(''); setCode(''); setActive(''); setPage(1); fetchList(); }} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </form>

      {/* Yeni Komisyon Ekle */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Yeni Komisyon Ekle</h2>
        <form onSubmit={createCommission} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-sm text-muted mb-1">Influencer ID</label>
            <input value={nInfluencerId} onChange={(e) => setNInfluencerId(e.target.value)} type="number" min={1} required className="w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Kod (opsiyonel)</label>
            <input value={nCode} onChange={(e) => setNCode(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Örn: AHMET15" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Komisyon %</label>
            <input value={nPct} onChange={(e) => setNPct(Number(e.target.value))} type="number" min={1} max={100} required className="w-full rounded-md border px-3 py-2" />
            <p className="text-[11px] text-gray-500 mt-1">Varsayılan: %40 — değiştirilebilir.</p>
          </div>
          <div className="flex items-center gap-2">
            <input id="nActive" type="checkbox" checked={nActive} onChange={(e) => setNActive(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="nActive" className="text-sm">Aktif</label>
          </div>
          <div className="sm:col-span-4 flex items-center gap-3">
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
              <th className="px-4 py-2 text-left">Kod</th>
              <th className="px-4 py-2 text-left">Komisyon %</th>
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
            ) : rows.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.id}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span>{r.influencer_name || '-'}</span>
                      <span className="text-xs text-gray-500">{r.influencer_email || ''} · #{r.influencer_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono">{r.code || '—'}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input value={ePct} onChange={(e) => setEPct(Number(e.target.value))} type="number" min={1} max={100} className="w-24 rounded-md border px-2 py-1" />
                    ) : (
                      r.commission_pct
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={eActive} onChange={(e) => setEActive(e.target.checked)} className="h-4 w-4" />
                        Aktif
                      </label>
                    ) : r.active ? (
                      <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2">
                    {!isEditing ? (
                      <button onClick={() => startEdit(r)} className="text-blue-600 hover:text-blue-800">Düzenle</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(r)} disabled={savingEdit} className="rounded-md bg-emerald-600 text-white px-3 py-1 text-xs hover:bg-emerald-700 disabled:opacity-60">
                          {savingEdit ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-md border px-3 py-1 text-xs">İptal</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
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