/* Admin Dashboard (/admin/dashboard) — üç blok:
   1) Onay bekleyen indirim kodları (varsa görünür)
   2) Hızlı satış oluşturma
   3) Toplam hakediş (özet)
   Not: Bazı backend uçları hazır değilse güvenli fallback uygulanır.
*/
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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
  // UI'de otomatik doldurmak için opsiyonel alanlar — API dönmezse fallback uygulanır
  influencer_handle?: string;      // hesap adı (örn: @ahmet)
  influencer_full_name?: string;   // ad soyad (örn: Ahmet Yılmaz)
  commission_rate?: number; // %
};

type QuickSaleReq = {
  code: string;
  customer_url?: string;
  product?: string;
  amount: number;
  note?: string;
};

export default function AdminDashboardPage() {
  const [pendingCodes, setPendingCodes] = useState<PendingCode[] | null>(null);
  const [codesError, setCodesError] = useState<string | null>(null);

  // Hızlı satış form state
  const [qCode, setQCode] = useState('');
  const [qInfluencer, setQInfluencer] = useState<string>(''); // otomatik dolacak (geriye dönük uyum)
  const [qInfluencerHandle, setQInfluencerHandle] = useState<string>(''); // otomatik: hesap adı
  const [qInfluencerFullName, setQInfluencerFullName] = useState<string>(''); // otomatik: ad soyad
  const [qProduct, setQProduct] = useState('');
  const [qCustomerUrl, setQCustomerUrl] = useState('');
  const [qAmount, setQAmount] = useState<number | string>(''); // ürün fiyatı
  const [qRate, setQRate] = useState<number | null>(null); // komisyon oranı (%)
  const [qNote, setQNote] = useState<string>(''); // satış notu

  // Komisyon tutarı: (ürün tutarı) x (indirim kodunun komisyon oranı / 100)
  const commission = useMemo(() => {
    const amountNum = typeof qAmount === 'string' ? parseFloat(qAmount || '0') : qAmount || 0;
    const rateNum = qRate ?? 0;
    const earned = (Number.isFinite(amountNum) ? amountNum : 0) * (rateNum / 100);
    if (!Number.isFinite(earned)) return 0;
    return Math.max(0, Math.round(earned * 100) / 100);
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
    // alanları sıfırla
    setQInfluencer('');
    setQInfluencerHandle('');
    setQInfluencerFullName('');
    setQRate(null);
    if (!code || code.trim().length < 1) return;
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(code)}`, { credentials: 'include', cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) return;
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }
      const detail: CodeDetail = (json?.code ?? json) as CodeDetail;

      // hesap adı/ad-soyad için esnek alan eşlemesi
      const handle = detail?.influencer_handle ?? detail?.influencer_email ?? '';
      const fullName = detail?.influencer_full_name ?? (detail as any)?.full_name ?? '';

      if (handle) {
        setQInfluencer(handle);         // geriye dönük uyum
        setQInfluencerHandle(handle);   // yeni alan
      }
      if (fullName) {
        setQInfluencerFullName(fullName);
      }
      if (typeof detail?.commission_rate === 'number') {
        setQRate(detail.commission_rate);
      }
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
        amount: numericAmount,
        note: qNote || undefined
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

  // Son onaylanan kodları kısa süre göstermek için (sessionStorage kökenli)
  const [recentApproved, setRecentApproved] = useState<Array<{id:number; code:string; discount_pct:number; commission_pct:number; ts:number}>>([]);
  useEffect(() => {
    try {
      const k = 'recentlyApprovedCodes';
      const raw = sessionStorage.getItem(k);
      if (!raw) return;
      const arr = (JSON.parse(raw) || []).filter((x: any) => typeof x?.ts === 'number');
      // 10 dakika içinde onaylananları göster
      const now = Date.now();
      const filtered = arr.filter((x: any) => now - x.ts <= 10 * 60 * 1000);
      setRecentApproved(filtered);
      // temizlik: eskileri at
      sessionStorage.setItem(k, JSON.stringify(filtered));
    } catch {}
  }, []);
  return (
    <main className="space-y-6 p-4 sm:p-6">

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
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-white/5"
                  onClick={() => {
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
                    (async () => {
                      try {
                        // Backend beklenen alan adları: discount_pct, commission_pct, is_active
                        const res = await fetch(`/api/codes/${encodeURIComponent(String(c.id))}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            // bilgi amaçlı status taşıyabiliriz ama backend'te esas belirleyici is_active
                            status: 'approved',
                            discount_pct: discount_percentage,
                            commission_pct: commission_pct,
                            is_active: true
                          })
                        });
                        const text = await res.text();
                        if (!res.ok) {
                          let msg = text;
                          try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
                          alert(msg || 'Kod onaylama başarısız.');
                          return;
                        }
                        // Son onaylanan kodu kısa süre göstermek için local UI duyurusu
                        try {
                          const approved = JSON.parse(text || '{}');
                          // basit bildirim stoğu (sessionStorage) — sayfa yenilense bile kısa süre göstermek için
                          const k = 'recentlyApprovedCodes';
                          const list = JSON.parse(sessionStorage.getItem(k) || '[]');
                          list.unshift({
                            id: c.id,
                            code: c.code,
                            discount_pct: discount_percentage,
                            commission_pct: commission_pct,
                            ts: Date.now()
                          });
                          // ilk 5 kayıt tut
                          sessionStorage.setItem(k, JSON.stringify(list.slice(0, 5)));
                        } catch {}
                        // Listeyi yenilemeden önce sayfada alt bildirim alanını tetiklemek için soft refresh
                        location.reload();
                      } catch {
                        alert('Beklenmeyen bir hata oluştu.');
                      }
                    })();
                  }}
                >
                  <td>{c.code}</td>
                  <td>{c.influencer_email ?? c.influencer_id ?? '-'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                  <td>{typeof c.commission_rate === 'number' ? c.commission_rate : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <a href="/admin/codes" className="inline-flex nav-btn px-3 py-2 rounded-md text-sm border border-[#1e293b]">Kodlara Git</a>
          </div>
        </section>
      ) : null}

      {/* Onaylanan son kodlar (geçici bildirim) */}
      {recentApproved.length > 0 && (
        <section className="rounded-md border card-like p-4">
          <h3 className="text-sm font-semibold mb-2">Yeni Aktif Edilen Kodlar (son 10 dk)</h3>
          <div className="overflow-x-auto">
            <table className="table-admin text-sm">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>İndirim (%)</th>
                  <th>Komisyon (%)</th>
                  <th>Onay Zamanı</th>
                </tr>
              </thead>
              <tbody>
                {recentApproved.map((r) => (
                  <tr key={`${r.id}-${r.ts}`}>
                    <td className="font-mono">{r.code}</td>
                    <td>{r.discount_pct}</td>
                    <td>{r.commission_pct}</td>
                    <td>{new Date(r.ts).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted mt-2">Bu liste geçici olarak görüntülenir ve kısa süre sonra kendiliğinden temizlenir.</p>
        </section>
      )}

      {/* 2) Hızlı satış alanı */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Panosu</h1>
        <div>
          <Link href="/admin/alerts" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Sistem Uyarıları
          </Link>
        </div>
      </div>

      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Hızlı Satış</h2>
        <form onSubmit={submitSale} className="grid gap-3 sm:grid-cols-2">
          {/* İndirim Kodu (required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">İndirim Kodu</label>
            <input
              value={qCode}
              onChange={(e) => setQCode(e.target.value)}
              onBlur={() => resolveCodeInfo(qCode)}
              placeholder="Örn: AHMET15"
              required
              className="rounded-md border px-3 py-2"
            />
          </div>

          {/* Influencer (hesap adı - otomatik, required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Influencer (hesap adı - otomatik)</label>
            <input value={qInfluencerHandle || qInfluencer || ''} readOnly required className="rounded-md border px-3 py-2 opacity-90" />
          </div>

          {/* Influencer Ad Soyad (otomatik, required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Influencer Ad Soyad (otomatik)</label>
            <input value={qInfluencerFullName || ''} readOnly required className="rounded-md border px-3 py-2 opacity-90" />
          </div>

          {/* Müşteri (URL - required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Müşteri (URL)</label>
            <input
              value={qCustomerUrl}
              onChange={(e) => setQCustomerUrl(e.target.value)}
              placeholder="https://"
              required
              className="rounded-md border px-3 py-2"
            />
          </div>

          {/* Ürün (required) */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-muted">Ürün</label>
            <input
              value={qProduct}
              onChange={(e) => setQProduct(e.target.value)}
              placeholder="Ürün adı / SKU / açıklama"
              required
              className="rounded-md border px-3 py-2"
            />
          </div>

          {/* Tutar (required) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Tutar (₺)</label>
            <input
              value={qAmount}
              onChange={(e) => setQAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              className="rounded-md border px-3 py-2"
            />
          </div>

          {/* Komisyon (otomatik, required bilgi alanı) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted">Komisyon (otomatik)</label>
            <input
              value={commission}
              readOnly
              required
              className="rounded-md border px-3 py-2 opacity-90"
              aria-description="İndirim kodunun komisyon oranından hakedilen komisyon tutarı (otomatik)"
            />
          </div>

          {/* Satış Notu (opsiyonel) */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-muted">Satış Notu</label>
            <textarea
              value={qNote || ''}
              onChange={(e) => setQNote(e.target.value)}
              placeholder="Opsiyonel: sipariş/ürün hakkında kısa not"
              rows={3}
              className="rounded-md border px-3 py-2"
            />
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
          Komisyon, indirim kodunun komisyon oranından hakedilen komisyon tutarı olarak otomatik hesaplanır.
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