/* /admin/codes — Pending onay ve kod ekleme alanı */
'use client';
import React, { useEffect, useMemo, useState } from 'react';

type PendingCode = {
  id: number;
  code: string;
  influencer_id?: number;
  influencer_email?: string;
  created_at?: string;
  commission_pct?: number; // %
};

type InfluencerOption = { id: number; name: string; email?: string; social_handle?: string };

export default function AdminCodesPage() {
  const [pendingCodes, setPendingCodes] = useState<PendingCode[] | null>(null);
  const [codesError, setCodesError] = useState<string | null>(null);

  // Yeni kod formu
  const [influencerId, setInfluencerId] = useState('');
  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState(10); // varsayılan %10
  const [commissionPct, setCommissionPct] = useState(40); // varsayılan %40
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Autocomplete state (hesap adı ve ad-soyad ile arama)
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<InfluencerOption[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  // Otomatik dolacak alanlar
  const [influencerHandle, setInfluencerHandle] = useState('');
  const [influencerFullName, setInfluencerFullName] = useState('');

  // Pendingleri çek
  useEffect(() => {
    let ignore = false;
    console.log('[DEBUG] useEffect başladı, ignore:', ignore);
    (async () => {
      try {
        console.log('[DEBUG] API çağrısı yapılıyor: /api/codes?status=pending');
        const res = await fetch('/api/codes?status=pending', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        console.log('[DEBUG] API yanıtı:', res.status, res.statusText, 'Body:', text);
        if (!res.ok) {
          if (!ignore) {
            console.log('[DEBUG] HTTP hata, ignore:', ignore);
            setPendingCodes([]);
            setCodesError(`HTTP ${res.status}: ${res.statusText}`);
          }
          return;
        }
        let json: any = {};
        try { json = JSON.parse(text || '{}'); } catch { json = {}; }
        const arr: PendingCode[] = Array.isArray(json?.codes) ? json.codes : [];
        console.log('[DEBUG] Parse edilen kodlar:', arr);
        if (!ignore) {
          console.log('[DEBUG] State güncelleniyor, ignore:', ignore);
          setPendingCodes(arr);
          setCodesError(null);
        }
      } catch (err: any) {
        console.log('[DEBUG] Catch bloğu, ignore:', ignore);
        if (!ignore) {
          setPendingCodes([]);
          setCodesError(err?.message || 'Beklenmeyen bir hata oluştu');
        }
      }
    })();
    return () => {
      console.log('[DEBUG] useEffect cleanup, ignore true yapılıyor');
      ignore = true;
    };
  }, []);

  async function approve(codeRow: PendingCode) {
    const dfltDiscount = 10;
    const dfltCommission = 40;
    const discountStr = prompt(`İndirimi onayla — İndirim % (varsayılan ${dfltDiscount})`, String(dfltDiscount));
    if (discountStr === null) return;
    const commissionStr = prompt(`İndirimi onayla — Komisyon % (varsayılan ${dfltCommission})`, String(dfltCommission));
    if (commissionStr === null) return;
    const discount_percentage = Number(discountStr);
    const commission_pct = Number(commissionStr);
    if (!(discount_percentage >= 1 && discount_percentage <= 100)) {
      alert('İndirim yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    if (!(commission_pct >= 1 && commission_pct <= 100)) {
      alert('Komisyon yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(String(codeRow.id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          is_active: true,
          discount_percentage,
          commission_pct
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        alert(msg || 'Kod onaylama başarısız.');
        return;
      }
      alert('Kod onaylandı.');
      // local listeden düş
      setPendingCodes((prev) => (prev || []).filter((p) => p.id !== codeRow.id));
    } catch {
      alert('Beklenmeyen bir hata oluştu.');
    }
  }

  async function searchInfluencers(q: string) {
    if (!q || q.trim().length < 2) {
      setOptions([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const params = new URLSearchParams({ q, limit: '20', page: '1' });
      const res = await fetch(`/api/influencers?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) {
        setOptions([]);
        return;
      }
      let json: any = [];
      try { json = JSON.parse(text || '[]'); } catch { json = []; }
      const list = Array.isArray(json) ? json : (json?.influencers || []);
      const mapped: InfluencerOption[] = (list || []).map((r: any) => ({
        id: Number(r?.id),
        name: String(r?.name || ''),
        email: r?.email,
        social_handle: r?.social_handle,
      }));
      setOptions(mapped);
    } catch {
      setOptions([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  function onPickInfluencer(opt: InfluencerOption) {
    setInfluencerId(String(opt.id));
    setQuery(`${opt.name}${opt.email ? ' • ' + opt.email : ''}${opt.social_handle ? ' • @' + opt.social_handle : ''}`);
    // Forma otomatik doldurma
    setInfluencerHandle(opt.social_handle ? `@${opt.social_handle}` : '');
    setInfluencerFullName(opt.name || '');
    setShowOptions(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr(null);
    setFormMsg(null);
    const inflIdNum = Number(influencerId);
    if (!influencerId || Number.isNaN(inflIdNum) || inflIdNum <= 0) {
      setFormErr('Lütfen üstten influencer seçin (ID otomatik dolar).');
      return;
    }
    if (!(discountPct >= 1 && discountPct <= 100)) {
      setFormErr('İndirim yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    if (!(commissionPct >= 1 && commissionPct <= 100)) {
      setFormErr('Komisyon yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          influencer_id: inflIdNum,
          code: code || undefined,
          discount_percentage: discountPct,
          commission_pct: commissionPct,
          is_active: isActive,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        setFormErr(msg || 'Kod oluşturma başarısız.');
        return;
      }
      setFormMsg('Kod oluşturuldu.');
      setCode('');
      setInfluencerId('');
      setQuery('');
      // pending list de değişmiş olabilir, tazele
      try {
        const r2 = await fetch('/api/codes?status=pending', { credentials: 'include', cache: 'no-store' });
        const t2 = await r2.text();
        if (r2.ok) {
          let j2: any = {};
          try { j2 = JSON.parse(t2 || '{}'); } catch { j2 = {}; }
          const arr2: PendingCode[] = Array.isArray(j2?.codes) ? j2.codes : [];
          setPendingCodes(arr2);
        }
      } catch {}
    } catch {
      setFormErr('Beklenmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Kodlar</h1>

      {/* Onay bekleyen indirim kodları (varsa) */}
      {codesError ? (
        <div className="rounded-md border card-like p-4 bg-red-50 text-red-700">
          <h2 className="text-lg font-semibold mb-3">Hata</h2>
          <p>{codesError}</p>
        </div>
      ) : (pendingCodes && pendingCodes.length > 0) ? (
        <section className="rounded-md border card-like p-4">
          <h2 className="text-lg font-semibold mb-3">Onay Bekleyen İndirim Kodları</h2>
          <table className="table-admin text-sm">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Influencer</th>
                <th>Oluşturulma</th>
                <th>Komisyon (%)</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {pendingCodes.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td>{c.code}</td>
                  <td>{c.influencer_email ?? c.influencer_id ?? '-'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                  <td>{typeof c.commission_pct === 'number' ? c.commission_pct : '-'}</td>
                  <td>
                    <button
                      className="rounded-md border px-2 py-1 text-xs hover:bg-white/10"
                      onClick={() => approve(c)}
                    >
                      Onayla
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* İndirim kodu ekleme alanı (autocomplete ile) */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Yeni Kod Ekle</h2>
        <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
          {/* Influencer arama (hesap adı ve ad/soyad ile) */}
          <div className="space-y-2">
            <label className="block text-sm" htmlFor="influencer_search">Influencer</label>
            <div className="relative">
              <input
                id="influencer_search"
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  setShowOptions(true);
                  if (val.trim().length >= 2) searchInfluencers(val);
                  else setOptions([]);
                }}
                onFocus={() => {
                  setShowOptions(true);
                  if (query.trim().length >= 2) searchInfluencers(query);
                }}
                placeholder="Hesap adı (@kullanici) veya Ad Soyad ile ara (min 2 karakter)"
                className="w-full rounded-md border px-3 py-2"
              />
              {showOptions && (options.length > 0 || loadingSearch) && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
                  {loadingSearch && (
                    <div className="px-3 py-2 text-sm text-gray-500">Aranıyor…</div>
                  )}
                  {!loadingSearch && options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => onPickInfluencer(opt)}
                    >
                      <div className="font-medium">{opt.name}</div>
                      <div className="text-xs text-gray-500">
                        {opt.email || '—'} {opt.social_handle ? ` • @${opt.social_handle}` : ''}
                      </div>
                    </button>
                  ))}
                  {!loadingSearch && options.length === 0 && query.trim().length >= 2 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Sonuç yok</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" htmlFor="influencer_handle">Influencer Hesap Adı (otomatik)</label>
                <input
                  id="influencer_handle"
                  type="text"
                  className="w-full rounded-md border px-3 py-2 bg-gray-50 text-gray-700"
                  value={influencerHandle}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs mb-1" htmlFor="influencer_fullname">Influencer Ad Soyad (otomatik)</label>
                <input
                  id="influencer_fullname"
                  type="text"
                  className="w-full rounded-md border px-3 py-2 bg-gray-50 text-gray-700"
                  value={influencerFullName}
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" htmlFor="influencer_id">Influencer ID (otomatik)</label>
              <input
                id="influencer_id"
                type="number"
                className="w-full rounded-md border px-3 py-2 bg-gray-50 text-gray-700"
                value={influencerId}
                readOnly
              />
              <p className="text-xs text-muted mt-1">Üstteki aramadan seçim yaptığınızda hesap adı, ad-soyad ve ID otomatik dolar.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="code">Kod (Opsiyonel)</label>
            <input
              id="code"
              type="text"
              className="w-full rounded-md border px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: AHMET15 (boş bırakılırsa otomatik üretilebilir)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="discount_pct">İndirim %</label>
              <input
                id="discount_pct"
                type="number"
                min={1}
                max={100}
                className="w-full rounded-md border px-3 py-2"
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="commission_pct">Komisyon %</label>
              <input
                id="commission_pct"
                type="number"
                min={1}
                max={100}
                className="w-full rounded-md border px-3 py-2"
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              className="h-4 w-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="is_active" className="text-sm">Aktif</label>
          </div>

          {formErr && <div className="text-sm text-red-500">{formErr}</div>}
          {formMsg && <div className="text-sm text-emerald-500">{formMsg}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937] disabled:opacity-60"
          >
            {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </form>
        <p className="text-xs text-muted mt-2">
          Varsayılan: İndirim %10, Komisyon %40 — değiştirilebilir.
        </p>
      </section>
    </main>
  );
}