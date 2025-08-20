/* Admin Dashboard (/admin/dashboard) — üç blok:
   1) Onay bekleyen indirim kodları (varsa görünür)
   2) Hızlı satış oluşturma
   3) Toplam hakediş (özet)
   Not: Bazı backend uçları hazır değilse güvenli fallback uygulanır.
*/
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getAdminPendingCodes,
  searchAdminCode,
  getAdminBalanceSummary,
  getAdminSalesStats,
  postAdminSale,
  putAdminCode,
  getAdminAllCodes,
  getAdminAllInfluencers,
  getAdminAllPayouts,
  getAdminRecentSales,
} from '@/lib/api';

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
  influencer_name?: string;        // API'den gelen ad soyad
  influencer_brand_name?: string;  // marka adı
  influencer_handle?: string;      // hesap adı (örn: @ahmet)
  discount_pct?: number;           // indirim yüzdesi
  commission_pct?: number;         // komisyon yüzdesi (API'den gelen)
  commission_rate?: number;        // alternatif field name
  is_active?: boolean;             // kod aktif mi
  created_at?: string;             // oluşturulma tarihi
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

  // Genel rapor verileri için state'ler
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
    console.log('[DEBUG] AdminDashboard: Fetching pending codes...');
    (async () => {
      try {
        const pendingCodesData = await getAdminPendingCodes();
        if (!ignore) {
          setPendingCodes(pendingCodesData);
          setCodesError(null);
        }
      } catch (error: any) {
        console.error('[DEBUG] AdminDashboard: Error fetching pending codes:', error);
        if (!ignore) {
          setPendingCodes([]);
          setCodesError(error?.message || 'Onay bekleyen kodlar alınamadı.');
        }
      }
    })();
    return () => {
      console.log('[DEBUG] AdminDashboard: Cleaning up pending codes effect');
      ignore = true;
    };
  }, []);

  // Kod detayı → influencer & oran
  const [loadingCodeInfo, setLoadingCodeInfo] = useState(false);
  const [codeInfoError, setCodeInfoError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Component unmount olduğunda timer'ı temizle
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);
  
  async function resolveCodeInfo(code: string, useDebounce = true) {
    // Önceki timer'ı iptal et
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Kodu temizle ve normalize et
    const cleanCode = code.trim().toUpperCase();
    
    // Alanları sıfırla
    setQInfluencer('');
    setQInfluencerHandle('');
    setQInfluencerFullName('');
    setQInfluencerBrandName('');
    setQRate(null);
    setCodeInfoError(null);
    
    // Kod formatını kontrol et
    if (!cleanCode || cleanCode.length < 2) {
      if (cleanCode.length > 0) {
        setCodeInfoError('Kod en az 2 karakter olmalıdır');
      }
      return;
    }
    
    // Sadece alfanümerik karakterlere izin ver
    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      setCodeInfoError('Kod sadece harf ve rakam içerebilir');
      return;
    }
    
    const performSearch = async () => {
      setLoadingCodeInfo(true);
      
      try {
        const result = await searchAdminCode(cleanCode);
        const detail = result.code;
        
        if (!detail?.id) {
          setCodeInfoError('Geçersiz kod bilgisi alındı');
          return;
        }

        // Influencer bilgilerini ayarla - daha güvenli field mapping
        const influencerHandle = detail.influencer_handle || detail.influencer_email || '';
        const influencerName = detail.influencer_name || '';
        const influencerBrand = detail.influencer_brand_name || '';
        
        // Komisyon oranı - birden fazla field'i kontrol et
        const commissionRate = detail.commission_pct ?? detail.commission_rate ?? null;
        
        setQInfluencer(influencerHandle);
        setQInfluencerHandle(influencerHandle);
        setQInfluencerFullName(influencerName);
        setQInfluencerBrandName(influencerBrand);
        setQRate(commissionRate);
        
        // Başarı mesajı (isteğe bağlı)
        if (influencerBrand) {
          setCodeInfoError(null); // Hata mesajını temizle
        }
        
      } catch (e: any) {
        console.error('Kod bilgisi alınırken hata:', e);
        if (e?.status === 404) {
          setCodeInfoError(`"${cleanCode}" kodu bulunamadı veya aktif değil. Lütfen geçerli bir kod girin.`);
        } else if (e?.status === 400) {
          setCodeInfoError(e?.message || 'Geçersiz kod formatı. Lütfen doğru bir kod girin.');
        } else {
          setCodeInfoError(`Bir hata oluştu. Lütfen tekrar deneyin. (Hata: ${e?.status || 'Bilinmeyen hata'})`);
        }
      } finally {
        setLoadingCodeInfo(false);
      }
    };
    
    if (useDebounce) {
      // Debounce ile API çağrısı
      const timer = setTimeout(performSearch, 300); // 300ms debounce (daha hızlı)
      setDebounceTimer(timer);
    } else {
      // Hemen arama yap
      performSearch();
    }
  }

  // 3) Hakediş özeti (fallback ile)
  useEffect(() => {
    let ignore = false;
    console.log('[DEBUG] AdminDashboard: Fetching balance summary...');
    (async () => {
      try {
        const primaryEndpoint = 'http://localhost:5003/api/balance/admin-summary/summary';
        console.log(`[DEBUG] AdminDashboard: Calling primary endpoint: ${primaryEndpoint}`);
        
        try {
          const result = await getAdminBalanceSummary();
          console.log('[DEBUG] AdminDashboard: Primary response:', result);
          const val = result?.balance;
          console.log(`[DEBUG] AdminDashboard: Primary balance value: ${val}`);
          if (!ignore && typeof val === 'number') {
            setPayoutTotal(val);
          }
        } catch (error) {
          console.log(`[DEBUG] AdminDashboard: Primary endpoint failed, trying fallback...`);
          console.log(`[DEBUG] AdminDashboard: Calling fallback endpoint: getAdminSalesStats`);
          
          try {
            const result = await getAdminSalesStats();
            // Fallback endpoint is now /api/sales/stats
            console.log('[DEBUG] AdminDashboard: Fallback response:', result);
            const total = result?.stats?.total_commission;
            console.log(`[DEBUG] AdminDashboard: Fallback total commission: ${total}`);
            if (!ignore && typeof total === 'number') {
              setPayoutTotal(total);
            }
          } catch (e) {
            console.error('[DEBUG] AdminDashboard: Fallback error:', e);
          }
        }
      } catch (error) {
        console.error('[DEBUG] AdminDashboard: Error fetching balance summary:', error);
        if (!ignore) setPayoutTotal(null);
      }
    })();
    return () => {
      console.log('[DEBUG] AdminDashboard: Cleaning up balance summary effect');
      ignore = true;
    };
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
      try {
        const result = await postAdminSale(body);
        setSaleMsg(result?.message || 'Satış kaydedildi.');
      } catch (error: any) {
        console.error('[DEBUG] AdminDashboard: Error posting sale:', error);
        setSaleErr(error?.message || 'Satış kaydetme başarısız.');
        return;
      }
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
        const activeCodes = await getAdminAllCodes(); // Tüm kodları getir, sonra filtrele
        if (!ignore) {
          const processedCodes = activeCodes
            .filter(code => code.is_active)
            .slice(0, 20) // Sadece ilk 20 aktif kodu al
            .map((code: any) => ({
              id: code?.id,
              code: code?.code || '',
              discount_pct: typeof code?.discount_pct === 'number' ? code.discount_pct : null,
              commission_pct: typeof code?.commission_pct === 'number' ? code.commission_pct : null,
              created_at: code?.created_at || '',
            }));
          setRecentActiveCodes(processedCodes);
        }
      } catch (e: any) {
        if (!ignore) {
          setActiveCodesError(e?.message || 'Aktif kodlar yüklenirken bir hata oluştu.');
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
    
    const fetchRecentSales = async () => {
      setSalesLoading(true);
      setSalesError(null);
      
      try {
        // Updated endpoint: /api/sales with limit parameter
        const list = await getAdminRecentSales(20);
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
      } catch (error) {
        console.error('[DEBUG] AdminDashboard: Error fetching recent sales:', error);
        if (!ignore) {
          setSalesError('Satışlar alınamadı.');
        }
      } finally {
        if (!ignore) {
          setSalesLoading(false);
        }
      }
    };
    
    fetchRecentSales();
    return () => { ignore = true; };
  }, []);

  // Genel rapor verilerini al
  useEffect(() => {
    let ignore = false;
    
    const fetchReportData = async () => {
      setReportLoading(true);
      setReportError(null);
      
      try {
        // Yeni admin balance summary endpoint'inden verileri al
        const balanceSummary = await getAdminBalanceSummary();
        
        if (!ignore) {
          setReportData({
            activeCodesCount: balanceSummary.activeCodesCount || 0,
            pendingCodesCount: balanceSummary.pendingCodesCount || 0,
            activeInfluencersCount: balanceSummary.activeInfluencersCount || 0,
            commissionSinceLastPayout: balanceSummary.commissionSinceLastPayout || 0,
            salesAmountSinceLastPayout: balanceSummary.salesAmountSinceLastPayout || 0,
            totalCommissionPaid: balanceSummary.totalPayouts || 0,
            totalSalesAmount: balanceSummary.totalSalesAmount || 0,
            salesAmountUntilLastPayout: 0, // Bu değeri aşağıda hesaplayacağız
            totalSalesCount: 0, // Yeni alan
            totalProductAmount: 0, // Yeni alan
            totalEarnedCommission: 0, // Yeni alan
          });
        }
      } catch (error) {
        console.error('[DEBUG] AdminDashboard: Error fetching report data:', error);
        if (!ignore) {
          setReportError('Rapor verileri yüklenirken bir hata oluştu.');
        }
      } finally {
        if (!ignore) {
          setReportLoading(false);
        }
      }
    };
    
    fetchReportData();
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
                        try {
                          const payload = {
                            // bilgi amaçlı status taşıyabiliriz ama backend'te esas belirleyici is_active
                            status: 'approved',
                            discount_pct: discount_percentage,
                            commission_pct: commission_pct,
                            is_active: true
                          };
                          await putAdminCode(c.id, payload);
                          alert('Kod onaylandı.');
                        } catch (error: any) {
                          console.error('[DEBUG] AdminDashboard: Error approving code:', error);
                          alert(error?.message || 'Kod onaylama başarısız.');
                          return;
                        }
                        // Son onaylanan kodu kısa süre göstermek için local UI duyurusu
                        try {
                          // basit bildirim stoğu (sessionStorage) — sayfa yenilense bile kısa süre göstermek için
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
              <label className="text-sm text-muted">
                İndirim Kodu
                <span className="text-xs text-gray-500 ml-1">(büyük/küçük harf duyarsız)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={qCode}
                  onChange={(e) => {
                    setQCode(e.target.value);
                    if (e.target.value.trim().length > 2) {
                      resolveCodeInfo(e.target.value);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      resolveCodeInfo(qCode);
                    }
                  }}
                  onBlur={() => resolveCodeInfo(qCode)}
                  placeholder="Örn: AHMET15"
                  required
                  className="rounded-md border px-3 py-2 flex-1"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => resolveCodeInfo(qCode)}
                  disabled={loadingCodeInfo || !qCode.trim() || qCode.trim().length < 2}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center min-w-[60px]"
                >
                  {loadingCodeInfo ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'Ara'}
                </button>
              </div>
              {codeInfoError && (
                <div className="text-red-500 text-xs mt-1 p-2 bg-red-50 rounded">{codeInfoError}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Kod en az 2 karakter olmalı ve sadece harf/rakam içermelidir
              </div>
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
                              try {
                                const payload = {
                                  discount_pct: discount_percentage,
                                  commission_pct: commission_pct,
                                };
                                await putAdminCode(code.id, payload);
                                alert('Kod başarıyla güncellendi.');
                              } catch (error: any) {
                                console.error('[DEBUG] AdminDashboard: Error updating code:', error);
                                alert(error?.message || 'Kod güncelleme başarısız.');
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