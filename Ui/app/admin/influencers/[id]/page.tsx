'use client';

import React, { useEffect, useState } from 'react';

/* LOCAL HELPERS: Bu dosyada kullanılan yardımcı bileşenleri burada tanımlıyoruz
   - BalanceAndSettlement: Bakiye ve son hesap kesimi özetini gösterir
   - QuickSaleButton: Hızlı satış ekleme paneli ve POST çağrısı
*/

function BalanceAndSettlement({ influencerId }: { influencerId: number }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [lastSettlement, setLastSettlement] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const res = await fetch(`/api/balance/${encodeURIComponent(String(influencerId))}/summary`, {
          credentials: 'include', cache: 'no-store'
        });
        const text = await res.text();
        if (!res.ok) return;
        const j = JSON.parse(text || '{}');
        const bal = Number(j?.balance ?? j?.total_balance ?? 0);
        if (!abort) {
          setBalance(Number.isFinite(bal) ? bal : 0);
          setLastSettlement(j?.last_settlement_at || null);
        }
      } catch {}
    }
    if (influencerId) run();
    return () => { abort = true; };
  }, [influencerId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted mb-1">Mevcut Bakiye</div>
        <div className="text-xl font-semibold">
          {balance == null ? '—' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance)}
        </div>
      </div>
      <div className="rounded-md border p-4">
        <div className="text-sm text-muted mb-1">Son Hesap Kesimi</div>
        <div className="text-xl font-semibold">
          {lastSettlement ? new Date(lastSettlement).toLocaleString() : '—'}
        </div>
      </div>
    </div>
  );
}

function QuickSaleButton({
  influencerId,
  codes,
  onSaved
}: {
  influencerId: number;
  codes: any[];
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string>('');
  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const active = (codes || []).filter((c: any) => c?.code && c?.is_active !== false);
    if (active.length > 0) setCode(prev => prev || String(active[0].code));
    else setCode('');
  }, [codes]);

  async function submit() {
    try {
      if (!code) throw new Error('Kod seçiniz');
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Geçerli tutar giriniz');
      setSaving(true);
      // Not: API proxy’de /api/sales POST bulunmalıdır; yoksa eklenmesi gerekir.
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code, customer: customer || undefined, product: product || undefined,
          amount: amountNum, note: note || undefined
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Satış kaydedilemedi');
      }
      setOpen(false);
      setCustomer(''); setProduct(''); setAmount(''); setNote('');
      await onSaved?.();
    } catch (e: any) {
      alert(e?.message || 'Satış kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[#0f172a] text-white px-3 py-2 text-sm hover:bg-[#1f2937]"
      >
        Hızlı Satış Ekle
      </button>
      {open && (
        <div className="mt-3 rounded-md border p-3 bg-white">
          <div className="grid sm:grid-cols-5 gap-2 items-end">
            <div className="sm:col-span-2">
              <label className="block text-sm text-muted mb-1">Kod</label>
              <select value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border px-3 py-2">
                <option value="">— Kod seçin —</option>
                {(codes || []).filter((c:any) => c?.code).map((c:any) => (
                  <option key={c.code} value={c.code}>{c.code} {c.is_active === false ? '(pasif)' : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1">Aktif kod varsa otomatik seçilir.</p>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Müşteri</label>
              <input value={customer} onChange={e => setCustomer(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Ad Soyad / E‑posta" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Ürün</label>
              <input value={product} onChange={e => setProduct(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Ürün / Paket" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Tutar (TRY)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="0" />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-sm text-muted mb-1">Not</label>
              <input value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Not (opsiyonel)" />
            </div>
            <div className="sm:col-span-5 flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                className="rounded-md bg-[#0f172a] text-white px-3 py-2 text-sm hover:bg-[#1f2937] disabled:opacity-50"
                onClick={submit}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setOpen(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type InflDetail = {
  id: number;
  name: string;
  email: string;
  social_handle: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  niche?: string;
  channels?: string[];
  country?: string;
  bio?: string | null;
  website?: string | null;
  brandName?: string | null; // Yeni eklenen alan
  created_at?: string;
  updated_at?: string;
};

type CodeRow = {
  id: number;
  code: string;
  discount_pct?: number;
  commission_pct?: number;
  is_active?: boolean | number;
  created_at?: string;
};

function getIdFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const segs = window.location.pathname.split('/').filter(Boolean);
  const id = segs[segs.length - 1];
  return id || null;
}

export default function AdminInfluencerDetailPage() {
  const [detail, setDetail] = useState<InflDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<InflDetail>>({});

  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [codesErr, setCodesErr] = useState<string | null>(null);

  // Bakiye özeti
  const [balance, setBalance] = useState<number | null>(null);
  const [lastSettlement, setLastSettlement] = useState<string | null>(null);

  // Satışlar
  type SaleRow = {
    id: number;
    date?: string | null;
    code: string;
    customer?: string | null;
    product?: string | null;
    amount?: number | null;
    commission_amount?: number | null;
    note?: string | null;
  };
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [salesErr, setSalesErr] = useState<string | null>(null);
  const [savingSaleId, setSavingSaleId] = useState<number | null>(null);

  // Disclosure state
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  const inflId = getIdFromPath();

  async function loadDetail() {
    if (!inflId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/influencers/${encodeURIComponent(inflId)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Detay yüklenemedi.');
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const d = (json?.influencer ?? json) as any; // Backend'den gelen ham veri
      const parsedChannels = typeof d?.social_media === 'string' ? JSON.parse(d.social_media || '[]') : (Array.isArray(d?.social_media) ? d.social_media : []);
      const detailData: InflDetail = {
        id: d?.id,
        name: d?.full_name ?? '', // full_name'i name olarak kullan
        email: d?.email ?? '',
        social_handle: d?.social_handle ?? d?.social_media ?? '', // social_media'yı social_handle olarak kullan
        status: d?.status ?? 'approved',
        niche: d?.niche ?? '',
        channels: parsedChannels, // social_media'yı channels olarak parse et
        country: d?.country ?? '',
        bio: d?.about ?? '', // about'u bio olarak kullan
        website: d?.website ?? '',
        brandName: d?.brand_name ?? '', // brand_name'i brandName olarak kullan
        created_at: d?.created_at,
        updated_at: d?.updated_at,
      };
      setDetail(detailData);
      setForm({
        name: detailData.name,
        email: detailData.email,
        social_handle: detailData.social_handle,
        status: detailData.status,
        niche: detailData.niche,
        country: detailData.country,
        bio: detailData.bio,
        website: detailData.website,
        brandName: detailData.brandName, // Yeni eklenen alan
        channels: detailData.channels,
      });
    } catch (e: any) {
      setError(e?.message || 'Detay yüklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function loadCodes() {
    setCodesErr(null);
    setCodes([]);
    if (!inflId) return;
    try {
      // Fallback: tüm kodları al, client'ta filtrele
      const res = await fetch(`/api/codes`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const text = await res.text();
      if (!res.ok) return;
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch {}
      const list: any[] = Array.isArray(json?.codes) ? json.codes : (Array.isArray(json) ? json : []);
      const filtered = list.filter((c: any) => String(c?.influencer_id) === String(inflId));
      setCodes(filtered.map((r: any) => ({
        id: Number(r?.id),
        code: String(r?.code || ''),
        discount_pct: Number(r?.discount_pct ?? r?.discount_percentage),
        commission_pct: Number(r?.commission_pct ?? r?.commission_rate),
        is_active: !!(r?.is_active ?? true),
        created_at: r?.created_at,
      })));
    } catch {
      setCodesErr(null);
    }
  }

  async function loadBalanceSummary() {
    if (!inflId) return;
    try {
      const res = await fetch(`/api/balance/${encodeURIComponent(String(inflId))}/summary`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const text = await res.text();
      if (!res.ok) return;
      const j = JSON.parse(text || '{}');
      const bal = Number(j?.balance ?? j?.total_balance ?? 0);
      setBalance(Number.isFinite(bal) ? bal : 0);
      setLastSettlement(j?.last_settlement_at || null);
    } catch {
      /* yoksay */
    }
  }

  async function loadSales() {
    if (!inflId) return;
    setSalesErr(null);
    try {
      const params = new URLSearchParams({ influencerId: String(inflId), page: '1', limit: '50' });
      const res = await fetch(`/api/sales?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const text = await res.text();
      if (!res.ok) {
        setSalesErr('Satışlar yüklenemedi');
        return;
      }
      const j = JSON.parse(text || '{}');
      const items = Array.isArray(j?.items) ? j.items : (Array.isArray(j) ? j : []);
      setSales(
        items.map((s: any) => ({
          id: Number(s?.id),
          date: s?.date ?? s?.recorded_at ?? null,
          code: String(s?.code || ''),
          customer: s?.customer || null,
          product: s?.package_name || s?.product || null,
          amount: s?.amount != null ? Number(s?.amount) : (s?.package_amount != null ? Number(s?.package_amount) : null),
          commission_amount: s?.commission_amount != null ? Number(s?.commission_amount) : (s?.commission_pct != null && s?.amount != null ? (Number(s?.amount) * Number(s?.commission_pct) / 100) : null),
          note: s?.note || null
        }))
      );
    } catch {
      setSalesErr('Satışlar yüklenemedi');
    }
  }

  useEffect(() => { loadDetail(); }, [inflId]);
  useEffect(() => { loadCodes(); }, [inflId]);
  useEffect(() => { loadBalanceSummary(); }, [inflId]);
  useEffect(() => { loadSales(); }, [inflId]);

  function setFormField<K extends keyof InflDetail>(key: K, value: InflDetail[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    if (!inflId) return;
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        full_name: form.name, // name'i full_name olarak gönder
        email: form.email,
        social_media: form.social_handle, // social_handle'ı social_media olarak gönder
        status: form.status,
        niche: form.niche,
        country: form.country,
        about: form.bio ?? null, // bio'yu about olarak gönder
        website: form.website ?? null,
        brand_name: form.brandName ?? null, // brandName'i brand_name olarak gönder
        channels: Array.isArray(form.channels) ? JSON.stringify(form.channels) : undefined, // channels'ı JSON string olarak gönder
      };
      const res = await fetch(`/api/influencers/${encodeURIComponent(inflId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        throw new Error(msg || 'Güncelleme başarısız.');
      }
      await loadDetail();
      setEditing(false);
      alert('Güncellendi.');
    } catch (e: any) {
      setError(e?.message || 'Güncelleme başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Influencer Detay</h1>
        <div className="flex items-center gap-2">
          <a href="/admin/codes" className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">Yeni Kod Ekle</a>
          <a href={`/admin/messages`} className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">Mesaj Gönder</a>
          <a href="/admin/payouts" className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">Ödeme Başlat</a>
        </div>
      </div>

      {/* Bakiye ve Son Hesap Kesimi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted mb-1">Mevcut Bakiye</div>
          <div className="text-xl font-semibold">
            {balance == null ? '—' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance)}
          </div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted mb-1">Son Hesap Kesimi</div>
          <div className="text-xl font-semibold">
            {lastSettlement ? new Date(lastSettlement).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

      {/* Profil kartı (varsayılan gizli, tıklayınca aç/kapat) */}
      <section className="rounded-md border card-like p-4">
        {!detail ? (
          <div className="text-sm text-muted">{busy ? 'Yükleniyor…' : 'Kayıt bulunamadı.'}</div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setDisclosureOpen(v => !v)}
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 mb-3 text-sm hover:bg-gray-50"
            >
              <span className="font-semibold">Genel Bilgiler</span>
              <span className="text-xs text-gray-600">{disclosureOpen ? 'Gizle' : 'Göster'}</span>
            </button>
            <div className={`space-y-4 ${disclosureOpen ? '' : 'hidden'}`}>
              {/* Üst bilgiler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Ad Soyad</label>
                  <input
                    value={form.name ?? ''}
                    onChange={(e) => setFormField('name', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">E‑posta</label>
                  <input
                    value={form.email ?? ''}
                    onChange={(e) => setFormField('email', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Hesap Adı</label>
                  <input
                    value={form.social_handle ?? ''}
                    onChange={(e) => setFormField('social_handle', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                    placeholder="@kullanici"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Durum</label>
                  <select
                    value={(form.status as any) ?? 'approved'}
                    onChange={(e) => setFormField('status', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    disabled={!editing}
                  >
                    <option value="approved">Aktif (approved)</option>
                    <option value="pending">Beklemede (pending)</option>
                    <option value="rejected">Reddedildi (rejected)</option>
                    <option value="suspended">Askıda (suspended)</option>
                  </select>
                </div>
              </div>

              {/* Diğer bilgiler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Niş</label>
                  <input
                    value={form.niche ?? ''}
                    onChange={(e) => setFormField('niche', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Ülke</label>
                  <input
                    value={form.country ?? ''}
                    onChange={(e) => setFormField('country', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-muted mb-1">Web Sitesi</label>
                  <input
                    value={form.website ?? ''}
                    onChange={(e) => setFormField('website', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                    placeholder="https://..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-muted mb-1">Marka Adı</label>
                  <input
                    value={form.brandName ?? ''}
                    onChange={(e) => setFormField('brandName', e.target.value as any)}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                    placeholder="Sosyal medyadaki marka adınız"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-muted mb-1">Biyografi</label>
                  <textarea
                    value={(form.bio ?? '') as any}
                    onChange={(e) => setFormField('bio', e.target.value as any)}
                    rows={3}
                    className="w-full rounded-md border px-3 py-2"
                    readOnly={!editing}
                  />
                </div>
              </div>

              {/* Kanallar etiketi (okuma amaçlı) */}
              <div>
                <label className="block text-sm text-muted mb-1">Kanallar</label>
                <div className="flex flex-wrap gap-2">
                  {(form.channels ?? []).length > 0 ? (
                    (form.channels as string[]).map((c, i) => (
                      <span key={i} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 border">{c}</span>
                    ))
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <button onClick={() => setEditing(true)} className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Düzenle</button>
                    <a href="/admin/influencers" className="rounded-md border px-4 py-2 text-sm">Listeye Dön</a>
                  </>
                ) : (
                  <>
                    <button onClick={onSave} disabled={busy} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60">
                      {busy ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                    <button onClick={() => { setEditing(false); loadDetail(); }} className="rounded-md border px-4 py-2 text-sm">İptal</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

     {/* Satışlar */}
     <section className="rounded-md border card-like p-4">
       <div className="mb-3 flex items-center justify-between">
         <h2 className="text-lg font-semibold">Satışlar</h2>
         <QuickSaleButton influencerId={Number(inflId)} codes={codes} onSaved={async () => { await loadSales(); }} />
       </div>
       {salesErr ? (
         <div className="text-sm text-muted">Satışlar yüklenemedi.</div>
       ) : sales.length === 0 ? (
         <div className="text-sm text-muted">Kayıt yok.</div>
       ) : (
         <div className="overflow-x-auto">
           <table className="min-w-full text-sm">
             <thead className="bg-gray-50 text-gray-700">
               <tr>
                 <th className="px-4 py-2 text-left">Tarih</th>
                 <th className="px-4 py-2 text-left">Kod</th>
                 <th className="px-4 py-2 text-left">Müşteri</th>
                 <th className="px-4 py-2 text-left">Ürün</th>
                 <th className="px-4 py-2 text-left">Tutar</th>
                 <th className="px-4 py-2 text-left">Komisyon</th>
                 <th className="px-4 py-2 text-left">Not</th>
                 <th className="px-4 py-2 text-left">İşlem</th>
               </tr>
             </thead>
             <tbody className="divide-y">
               {sales.map((s) => (
                 <tr key={s.id} className="hover:bg-gray-50">
                   <td className="px-4 py-2">{s.date ? new Date(s.date).toLocaleString() : '—'}</td>
                   <td className="px-4 py-2 font-mono">{s.code}</td>
                   <td className="px-4 py-2">{s.customer || '—'}</td>
                   <td className="px-4 py-2">{s.product || '—'}</td>
                   <td className="px-4 py-2">{s.amount != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(s.amount)) : '—'}</td>
                   <td className="px-4 py-2">{s.commission_amount != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(s.commission_amount)) : '—'}</td>
                   <td className="px-4 py-2">
                     <input
                       defaultValue={s.note || ''}
                       onChange={(e) => {
                         const v = e.target.value;
                         setSales((prev) => prev.map((row) => row.id === s.id ? { ...row, note: v } : row));
                       }}
                       className="w-full rounded-md border px-2 py-1"
                     />
                   </td>
                   <td className="px-4 py-2">
                     <button
                       disabled={savingSaleId === s.id}
                       onClick={async () => {
                         try {
                           setSavingSaleId(s.id);
                           const body: any = { note: s.note ?? '' };
                           const res = await fetch(`/api/sales/${encodeURIComponent(String(s.id))}`, {
                             method: 'PATCH',
                             headers: { 'Content-Type': 'application/json' },
                             credentials: 'include',
                             body: JSON.stringify(body)
                           });
                           const text = await res.text();
                           if (!res.ok) {
                             let msg = text;
                             try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
                             throw new Error(msg || 'Güncelleme başarısız');
                           }
                           await loadSales();
                         } catch (err: any) {
                           alert(err?.message || 'Güncelleme başarısız');
                         } finally {
                           setSavingSaleId(null);
                         }
                       }}
                       className="rounded-md border px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
                     >
                       {savingSaleId === s.id ? 'Kaydediliyor…' : 'Kaydet'}
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
     </section>

     {/* Kodlar (influencer’a ait) */}
     <section className="rounded-md border card-like p-4">
       <h2 className="text-lg font-semibold mb-3">Bağlı İndirim Kodları</h2>
       {codesErr ? (
         <div className="text-sm text-muted">Kodlar yüklenemedi.</div>
       ) : codes.length === 0 ? (
         <div className="text-sm text-muted">Kod bulunamadı.</div>
       ) : (
         <div className="overflow-x-auto">
           <table className="min-w-full text-sm">
             <thead className="bg-gray-50 text-gray-700">
               <tr>
                 <th className="px-4 py-2 text-left">Kod</th>
                 <th className="px-4 py-2 text-left">İndirim %</th>
                 <th className="px-4 py-2 text-left">Komisyon %</th>
                 <th className="px-4 py-2 text-left">Durum</th>
                 <th className="px-4 py-2 text-left">Oluşturma</th>
               </tr>
             </thead>
             <tbody className="divide-y">
               {codes.map((c) => (
                 <tr key={c.id} className="hover:bg-gray-50">
                   <td className="px-4 py-2 font-mono">{c.code}</td>
                   <td className="px-4 py-2">{Number.isFinite(c.discount_pct) ? c.discount_pct : '—'}</td>
                   <td className="px-4 py-2">{Number.isFinite(c.commission_pct) ? c.commission_pct : '—'}</td>
                   <td className="px-4 py-2">
                     {c.is_active ? (
                       <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>
                     ) : (
                       <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Pasif</span>
                     )}
                   </td>
                   <td className="px-4 py-2 text-gray-600">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
     </section>
   </main>
 );
}