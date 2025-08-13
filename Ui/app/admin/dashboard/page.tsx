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
  const [qInfluencerBrandName, setQInfluencerBrandName] = useState<string>(''); // otomatik: marka adı
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

  // Son satışlar
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Son aktif edilen kodlar
  const [recentActiveCodes, setRecentActiveCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [activeCodesError, setActiveCodesError] = useState<string | null>(null);

  // Genel rapor verileri
  const [reportData, setReportData] = useState({
    activeCodesCount: 0,
    pendingCodesCount: 0,
    activeInfluencersCount: 0,
    commissionSinceLastPayout: 0,
    salesAmountSinceLastPayout: 0,
    totalCommissionPaid: 0,
    totalSalesAmount: 0,
    salesAmountUntilLastPayout: 0,
    totalSalesCount: 0,
    totalProductAmount: 0,
    totalEarnedCommission: 0,
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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
    setQInfluencerBrandName('');
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

      // Influencer detaylarını al
      if (detail?.influencer_id) {
        try {
          const influencerRes = await fetch(`/api/influencers/${encodeURIComponent(detail.influencer_id)}`, { credentials: 'include', cache: 'no-store' });
          const influencerText = await influencerRes.text();
          if (influencerRes.ok) {
            let influencerJson: any = {};
            try { influencerJson = JSON.parse(influencerText || '{}'); } catch { influencerJson = {}; }
            const influencerDetail = influencerJson?.influencer ?? influencerJson;
            
            // Marka adını al (brand_name, company_name veya name alanlarından biri olabilir)
            const brandName = influencerDetail?.brand_name || influencerDetail?.company_name || influencerDetail?.name || '';
            if (brandName) {
              setQInfluencerBrandName(brandName);
            }
          }
        } catch {}
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

  // Son aktif edilen kodları al
  useEffect(() => {
    let ignore = false;
    (async () => {
      setCodesLoading(true);
      setActiveCodesError(null);
      try {
        // Aktif kodlar için status=active parametresi ile API çağrısı
        const res = await fetch('/api/codes?status=active&limit=20', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) {
          if (!ignore) {
            setActiveCodesError('Aktif kodlar alınamadı.');
          }
          return;
        }
        let json: any = {};
        try { json = JSON.parse(text || '{}'); } catch { json = {}; }
        const list = Array.isArray(json?.codes) ? json.codes : (Array.isArray(json) ? json : []);
        if (!ignore) {
          // Kodları işle ve gerekli alanları ayıkla
          const processedCodes = list.map((code: any) => ({
            id: code?.id,
            code: code?.code || '',
            discount_pct: typeof code?.discount_pct === 'number' ? code.discount_pct : null,
            commission_pct: typeof code?.commission_pct === 'number' ? code.commission_pct : null,
            created_at: code?.created_at || '',
          }));
          setRecentActiveCodes(processedCodes);
        }
      } catch {
        if (!ignore) {
          setActiveCodesError('Aktif kodlar yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!ignore) {
          setCodesLoading(false);
        }
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Son satışları al
  useEffect(() => {
    let ignore = false;
    (async () => {
      setSalesLoading(true);
      setSalesError(null);
      try {
        // Son 20 satış için limit=20 parametresi ile API çağrısı
        const res = await fetch('/api/sales?limit=20', { credentials: 'include', cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) {
          if (!ignore) {
            setSalesError('Satışlar alınamadı.');
          }
          return;
        }
        let json: any = {};
        try { json = JSON.parse(text || '{}'); } catch { json = {}; }
        const list = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.sales || []);
        if (!ignore) {
          // Satışları işle ve gerekli alanları ayıkla
          const processedSales = list.map((sale: any) => ({
            id: sale?.id,
            code: sale?.code || '',
            influencer_brand_name: sale?.influencer_brand_name || '',
            customer_url: sale?.customer_url || '',
            product: sale?.product || '',
            amount: typeof sale?.amount === 'number' ? sale.amount : null,
            commission_amount: typeof sale?.commission_amount === 'number' ? sale.commission_amount : null,
          }));
          setRecentSales(processedSales);
        }
      } catch {
        if (!ignore) {
          setSalesError('Satışlar yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!ignore) {
          setSalesLoading(false);
        }
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Genel rapor verilerini al
  useEffect(() => {
    let ignore = false;
    (async () => {
      setReportLoading(true);
      setReportError(null);
      try {
        // Tüm gerekli verileri paralel olarak al
        const [codesRes, influencersRes, salesStatsRes, payoutsRes] = await Promise.all([
          fetch('/api/codes', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/influencers', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/sales/stats', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/payouts', { credentials: 'include', cache: 'no-store' }),
        ]);

        if (!ignore) {
          let activeCodesCount = 0;
          let pendingCodesCount = 0;
          let activeInfluencersCount = 0;
          let commissionSinceLastPayout = 0;
          let salesAmountSinceLastPayout = 0;
          let totalCommissionPaid = 0;
          let totalSalesAmount = 0;

          // Kod sayıları
          if (codesRes.ok) {
            try {
              const codesText = await codesRes.text();
              const codesJson = JSON.parse(codesText || '[]');
              const codesList = Array.isArray(codesJson?.codes) ? codesJson.codes : (Array.isArray(codesJson) ? codesJson : []);
              activeCodesCount = codesList.filter((c: any) => c?.is_active === true).length;
              pendingCodesCount = codesList.filter((c: any) => c?.status === 'pending').length;
            } catch {}
          }

          // Aktif influencer sayısı
          if (influencersRes.ok) {
            try {
              const influencersText = await influencersRes.text();
              const influencersJson = JSON.parse(influencersText || '[]');
              const influencersList = Array.isArray(influencersJson) ? influencersJson : (influencersJson?.influencers || []);
              activeInfluencersCount = influencersList.filter((i: any) => i?.status === 'approved').length;
            } catch {}
          }

          // Satış istatistikleri
          if (salesStatsRes.ok) {
            try {
              const salesStatsText = await salesStatsRes.text();
              const salesStatsJson = JSON.parse(salesStatsText || '{}');
              const stats = salesStatsJson?.stats || {};
              totalSalesAmount = typeof stats?.total_revenue === 'number' ? stats.total_revenue : 0;
              commissionSinceLastPayout = typeof stats?.total_commission === 'number' ? stats.total_commission : 0;
              // salesAmountSinceLastPayout için ayrı bir hesaplama gerekebilir
            } catch {}
          }

          // Toplam ödenen komisyon
          if (payoutsRes.ok) {
            try {
              const payoutsText = await payoutsRes.text();
              const payoutsJson = JSON.parse(payoutsText || '[]');
              const payoutsList = Array.isArray(payoutsJson) ? payoutsJson : (payoutsJson?.payouts || []);
              totalCommissionPaid = payoutsList.reduce((sum: number, payout: any) => {
                return sum + (typeof payout?.amount === 'number' ? payout.amount : 0);
              }, 0);
            } catch {}
          }

          setReportData({
            activeCodesCount,
            pendingCodesCount,
            activeInfluencersCount,
            commissionSinceLastPayout,
            salesAmountSinceLastPayout,
            totalCommissionPaid,
            totalSalesAmount,
            salesAmountUntilLastPayout: 0, // Bu değeri aşağıda hesaplayacağız
            totalSalesCount: 0, // Yeni alan
            totalProductAmount: 0, // Yeni alan
            totalEarnedCommission: 0, // Yeni alan
          });
        }
      } catch {
        if (!ignore) {
          setReportError('Rapor verileri yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!ignore) {
          setReportLoading(false);
        }
      }
    })();
    return () => { ignore = true; };
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
                          sessionStorage.setItem(k, JSON.stringify(list.slice(0, 20)));
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

      {/* 2) Hızlı satış alanı */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Panosu</h1>
      </div>

      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Hızlı Satış</h2>
        
        {/* Kod Girişi ve Influencer Bilgileri Bölümü */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-md font-medium mb-3">Kod ve Influencer Bilgileri</h3>
          <div className="grid gap-3 sm:grid-cols-2">
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

            {/* Influencer Marka Adı (otomatik, required) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">Influencer Marka Adı (otomatik)</label>
              <input
                value={qInfluencerBrandName || ''}
                readOnly
                required
                className="rounded-md border px-3 py-2 bg-gray-100 text-gray-700"
              />
            </div>

            {/* Influencer (hesap adı - otomatik, required) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">Influencer (hesap adı - otomatik)</label>
              <input
                value={qInfluencerHandle || qInfluencer || ''}
                readOnly
                required
                className="rounded-md border px-3 py-2 bg-gray-100 text-gray-700"
              />
            </div>

            {/* Influencer Ad Soyad (otomatik, required) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted">Influencer Ad Soyad (otomatik)</label>
              <input
                value={qInfluencerFullName || ''}
                readOnly
                required
                className="rounded-md border px-3 py-2 bg-gray-100 text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Satış Bilgileri Bölümü */}
        <form onSubmit={submitSale} className="grid gap-3 sm:grid-cols-2">
          <h3 className="text-md font-medium mb-3 sm:col-span-2">Satış Bilgileri</h3>
          
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
              className="rounded-md border px-3 py-2 bg-gray-100 text-gray-700"
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

      {/* 3) Son girilen satışlar */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Son Girilen Satışlar</h2>
        {salesError ? (
          <div className="text-red-500 text-sm">{salesError}</div>
        ) : salesLoading ? (
          <div className="text-gray-500 text-sm">Yükleniyor...</div>
        ) : recentSales.length === 0 ? (
          <div className="text-gray-500 text-sm">Henüz satış bulunmamaktadır.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-admin text-sm">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Marka Adı</th>
                  <th>Müşteri</th>
                  <th>Ürün</th>
                  <th>Tutar (₺)</th>
                  <th>Komisyon (₺)</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono">{sale.code}</td>
                    <td>{sale.influencer_brand_name || '-'}</td>
                    <td>
                      {sale.customer_url ? (
                        <a href={sale.customer_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {sale.customer_url}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{sale.product || '-'}</td>
                    <td>{typeof sale.amount === 'number' ? Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sale.amount) : '-'}</td>
                    <td>{typeof sale.commission_amount === 'number' ? Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sale.commission_amount) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <a href="/admin/sales" className="inline-flex nav-btn px-3 py-2 rounded-md text-sm border border-[#1e293b]">
            Tüm Satışlara Git
          </a>
        </div>
      </section>

      {/* Son aktif edilen kodlar */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Son Aktif Edilen Kodlar</h2>
        {activeCodesError ? (
          <div className="text-red-500 text-sm">{activeCodesError}</div>
        ) : codesLoading ? (
          <div className="text-gray-500 text-sm">Yükleniyor...</div>
        ) : recentActiveCodes.length === 0 ? (
          <div className="text-gray-500 text-sm">Henüz aktif kod bulunmamaktadır.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-admin text-sm">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>İndirim (%)</th>
                  <th>Komisyon (%)</th>
                  <th>Oluşturulma</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {recentActiveCodes.map((code) => (
                  <tr key={code.id} className="cursor-pointer hover:bg-white/5">
                    <td className="font-mono">{code.code}</td>
                    <td>{typeof code.discount_pct === 'number' ? code.discount_pct : '-'}</td>
                    <td>{typeof code.commission_pct === 'number' ? code.commission_pct : '-'}</td>
                    <td>{code.created_at ? new Date(code.created_at).toLocaleString() : '-'}</td>
                    <td>
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => {
                          const currentDiscount = typeof code.discount_pct === 'number' ? code.discount_pct : 10;
                          const currentCommission = typeof code.commission_pct === 'number' ? code.commission_pct : 40;
                          const discountStr = prompt(`İndirim Oranı % (mevcut: ${currentDiscount})`, String(currentDiscount));
                          if (discountStr === null) return;
                          const commissionStr = prompt(`Komisyon Oranı % (mevcut: ${currentCommission})`, String(currentCommission));
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
                              const res = await fetch(`/api/codes/${encodeURIComponent(String(code.id))}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  discount_pct: discount_percentage,
                                  commission_pct: commission_pct,
                                })
                              });
                              const text = await res.text();
                              if (!res.ok) {
                                let msg = text;
                                try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch {}
                                alert(msg || 'Kod güncelleme başarısız.');
                                return;
                              }
                              alert('Kod başarıyla güncellendi.');
                              // Listeyi yenile
                              location.reload();
                            } catch {
                              alert('Beklenmeyen bir hata oluştu.');
                            }
                          })();
                        }}
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <a href="/admin/codes" className="inline-flex nav-btn px-3 py-2 rounded-md text-sm border border-[#1e293b]">
            Tüm Kodlara Git
          </a>
        </div>
      </section>

      {/* Genel Rapor Alanı */}
      <section className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Genel Rapor</h2>
        {reportError ? (
          <div className="text-red-500 text-sm">{reportError}</div>
        ) : reportLoading ? (
          <div className="text-gray-500 text-sm">Rapor verileri yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Kodlar</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Aktif Kodlar:</span>
                  <span className="font-medium">{reportData.activeCodesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Onay Bekleyen Kodlar:</span>
                  <span className="font-medium">{reportData.pendingCodesCount}</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Influencerlar</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Aktif Influencer:</span>
                  <span className="font-medium">{reportData.activeInfluencersCount}</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Son Ödemelerden Sonra</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Kazanılan Komisyon:</span>
                  <span className="font-medium">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.commissionSinceLastPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ürün Tutarı:</span>
                  <span className="font-medium">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.salesAmountSinceLastPayout)}</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Toplam</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Ödenen Komisyon:</span>
                  <span className="font-medium">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.totalCommissionPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Son Ödemeye Kadar Ürün Tutarı:</span>
                  <span className="font-medium">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.salesAmountUntilLastPayout)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Yeni eklenen toplam bilgiler */}
        <div className="mt-6 border rounded-md p-4 bg-gray-50">
          <h3 className="font-semibold text-lg mb-3">Toplam Bilgiler</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted">Toplam Satış Sayısı</div>
              <div className="text-xl font-bold">{reportData.totalSalesCount}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted">Toplam Ürün Tutarı</div>
              <div className="text-xl font-bold">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.totalProductAmount)}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted">Toplam Kazanılan Komisyon</div>
              <div className="text-xl font-bold">₺ {Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reportData.totalEarnedCommission)}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}