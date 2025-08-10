/* Admin Dashboard (/admin/dashboard) — üç blok:
   1) Onay bekleyen indirim kodları (varsa görünür)
   2) Hızlı satış oluşturma
   3) Toplam hakediş (özet)
   Not: Bazı backend uçları hazır değilse güvenli fallback uygulanır.
   NOT: Bu dosya geçici olarak /dashboard altında yayımlanıyordu. Artık /admin/dashboard altına kopyalanacaktır. */
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type PendingCode = {
  id: number;
  code: string;
  influencer_id?: number;
  influencer_email?: string;
  created_at?: string;
  commission_rate?: number; // %
};

type CodeDetail = {
  id: number;
  code: string;
  influencer_id: number;
  influencer_email?: string;
  commission_rate?: number; // %
};

type QuickSaleReq = {
  code: string;
  customer_url?: string;
  product?: string;
  amount: number;
};

export default function AdminDashboardPage() {
  const [pendingCodes, setPendingCodes] = useState<PendingCode[] | null>(null);
  const [codesError, setCodesError] = useState<string | null>(null);

  // Hızlı satış form state
  const [qCode, setQCode] = useState('');
  const [qInfluencer, setQInfluencer] = useState<string>(''); // otomatik dolacak
  const [qProduct, setQProduct] = useState('');
  const [qCustomerUrl, setQCustomerUrl] = useState('');
  const [qAmount, setQAmount] = useState<number | string>('');
  const [qRate, setQRate] = useState<number | null>(null); // %

  const commission = useMemo(() => {
    const a = typeof qAmount === 'string' ? parseFloat(qAmount || '0') : qAmount || 0;
    const r = qRate || 0;
    const v = (Number.isFinite(a) ? a : 0) * (r / 100);
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.round(v * 100) / 100);
  }, [qAmount, qRate]);

  const [saleBusy, setSaleBusy] = useState(false);
  const [saleMsg, setSaleMsg] = useState<string | null>(null);
  const [saleErr, setSaleErr] = useState<string | null>(null);

  const [payoutTotal, setPayoutTotal] = useState<number | null>(null);

  // 1) Onay bekleyen indirim kodları (varsa)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // Önerilen endpoint: /api/codes?status=pending (hazır değilse 404 gelebilir)
        const res = await fetch('/api/codes?status=pending', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) {
          if (!ignore) {
            setPendingCodes([]); // gösterme
            setCodesError(null);
          }
          return;
        }
        let json: any = [];
        try { json = JSON.parse(text || '[]'); } catch { json = []; }
        const arr: PendingCode[] = Array.isArray(json?.codes) ? json.codes : (Array.isArray(json) ? json : []);
        if (!ignore) {
          setPendingCodes(arr);
          setCodesError(null);
        }
      } catch {
        if (!ignore) {
          setPendingCodes([]);
          setCodesError(null);
        }
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Kod detayı → influencer & oran
  async function resolveCodeInfo(code: string) {
    setQInfluencer('');
    setQRate(null);
    if (!code || code.trim().length < 1) return;
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(code)}`, { credentials: 'include', cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) return;
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }
      const detail: CodeDetail = (json?.code ?? json) as CodeDetail;
      if (detail?.influencer_email) setQInfluencer(detail.influencer_email);
      if (typeof detail?.commission_rate === 'number') setQRate(detail.commission_rate);
    } catch {}
  }

  // 3) Hakediş özeti (fallback ile)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/balance/summary', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) {
          // fallback: /api/sales/stats
          const sres = await fetch('/api/sales/stats', { credentials: 'include', cache: 'no-store' });
          const stext = await sres.text();
          if (sres.ok) {
            try {
              const o = JSON.parse(stext || '{}');
              const total = o?.stats?.total_commission;
              if (!ignore && typeof total === 'number') {
                setPayoutTotal(total);
              }
            } catch {}
          }
          return;
        }
        let json: any = {};
        try { json = JSON.parse(text || '{}'); } catch { json = {}; }
        const val = json?.total ?? json?.sum ?? json?.amount;
        if (!ignore && typeof val === 'number') {
          setPayoutTotal(val);
        }
      } catch {
        if (!ignore) setPayoutTotal(null);
      }
    })();
    return () => { ignore = true; };
  }, []);

  async function submitSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaleErr(null);
    setSaleMsg(null);
    if (!qCode || !qAmount) {
      setSaleErr('Kod ve tutar zorunludur.');
      return;
    }
    const numericAmount = typeof qAmount === 'string' ? parseFloat(qAmount || '0') : qAmount;
    if (!isFinite(numericAmount) || numericAmount <= 0) {
      setSaleErr('Geçerli bir tutar giriniz.');
      return;
    }
    setSaleBusy(true);
    try {
      const body: QuickSaleReq = {
        code: qCode.trim(),
        customer_url: qCustomerUrl || undefined,
        product: qProduct || undefined,
        amount: numericAmount
      };
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
        setSaleErr(msg || 'Satış kaydetme başarısız.');
        return;
      }
      setSaleMsg('Satış kaydedildi.');
      setQProduct('');
    } catch {
      setSaleErr('Beklenmeyen bir hata oluştu.');
    } finally {
      setSaleBusy(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* 1) Onay bekleyen indirim kodları */}
      {codesError ? null : (pendingCodes && pendingCodes.length > 0) ? (
        <section className="rounded-md border card-like p-4">
          <h2 className="text-lg font-semibold mb-3">Onay Bekleyen İndirim Kodları</h2>
          <table className="table-admin text-sm">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Influencer</th>
                <th>Oluşturulma</th>
                <th>Komisyon (%)</th>
              </tr>
            </thead>
            <tbody>
              {pendingCodes.slice(0, 5).map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.influencer_email ?? c.influencer_id ?? '-'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                  <td>{typeof c.commission_rate === 'number' ? c.commission_rate : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <a href="/codes/new" className="inline-flex nav-btn px-3 py-2 rounded-md text-sm border border-[#1e293b]">Kodlara Git</a>
          </div>
        </section>
      ) : null}

      {/* 2) Hızlı satış alanı */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Hızlı Satış</h2>
        <form onSubmit={submitSale} className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">İndirim Kodu</label>
            <input
              value={qCode}
              onChange={(e) => setQCode(e.target.value)}
              onBlur={() => resolveCodeInfo(qCode)}
              placeholder="Örn: AHMET15"
              className="rounded-md border px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Influencer (otomatik)</label>
            <input value={qInfluencer} readOnly className="rounded-md border px-3 py-2 opacity-90" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Müşteri (URL opsiyonel)</label>
            <input
              value={qCustomerUrl}
              onChange={(e) => setQCustomerUrl(e.target.value)}
              placeholder="https://"
              className="rounded-md border px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Ürün</label>
            <input
              value={qProduct}
              onChange={(e) => setQProduct(e.target.value)}
              placeholder="Ürün adı / referans"
              className="rounded-md border px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Tutar (₺)</label>
            <input
              value={qAmount}
              onChange={(e) => setQAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="rounded-md border px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Komisyon (otomatik)</label>
            <input value={commission} readOnly className="rounded-md border px-3 py-2 opacity-90" />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            {saleErr && <span className="text-red-400 text-sm">{saleErr}</span>}
            {saleMsg && <span className="text-emerald-400 text-sm">{saleMsg}</span>}
            <button
              type="submit"
              disabled={saleBusy}
              className="inline-flex items-center rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937] disabled:opacity-50"
            >
              {saleBusy ? 'Kaydediliyor…' : 'Satışı Kaydet'}
            </button>
          </div>
        </form>
        <p className="text-xs text-muted mt-2">
          Komisyon, indirim kodunun tanımlı komisyon oranından otomatik hesaplanır.
        </p>
      </section>

      {/* 3) Hakedişler alanı */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Hakediş Özeti</h2>
        <div className="text-2xl">
          {payoutTotal != null ? `₺ ${Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(payoutTotal)}` : '—'}
        </div>
        <p className="text-xs text-muted mt-1">Tüm influencerların toplam hakedişleri (toplam + bakiyeler).</p>
      </section>
    </main>
  );
}