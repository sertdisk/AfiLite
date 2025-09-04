/* /admin/influencers — Influencerlar (liste + filtre) */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAdminInfluencerBalance } from '@/lib/api';

// Bakiye hücre bileşeni
function BalanceCell({ influencerId }: { influencerId: number }) {
  const [val, setVal] = useState<string>('—');
  useEffect(() => {
    let abort = false;
    async function fetchSummary() {
      try {
        const summary = await getAdminInfluencerBalance(influencerId);
        if (!abort) {
          const balance = Number(summary?.balance ?? summary?.total_balance ?? 0);
          setVal(new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance));
        }
      } catch (error) { console.error(error); }
      finally {
        if (!abort) setVal('—');
      }
    }
    fetchSummary();
    return () => { abort = true; };
  }, [influencerId]);
  return <span className="font-medium text-gray-800">{val}</span>;
}

// Influencer satır tipi
type InfluencerRow = {
  id: number;
  name: string;
  email: string;
  brand_name?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  codes?: {
    code: string;
    is_active: boolean;
  }[];
  created_at?: string;
};

// Sayfalı veri tipi
type Paged<T> = { items: T[]; total?: number; page?: number; limit?: number };

export default function AdminInfluencersPage() {
  // Filtre durumları
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Yüklenme durumları
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InfluencerRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  // Influencer listesini getir
  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      // Arama parametresi
      if (search.trim()) params.set('search', search.trim());
      
      // Tarih aralığı parametreleri
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      
      // Sayfalama parametreleri
      params.set('page', String(page));
      params.set('limit', String(limit));

      // Arama parametresi
      if (search.trim()) {
        if (search.trim().length === 1) {
          setRows([]);
          setTotal(0);
          setError('Arama terimi en az 2 karakter olmalıdır.');
          setBusy(false);
          return;
        }
        params.set('search', search.trim());
      }

      // Önce admin UI proxy'sini dene
      let res = await fetch(`/api/influencers?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      // Eğer proxy route bulunamadıysa (404 Not Found) doğrudan backend'e düş (geçici fallback)
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
        try { const j = JSON.parse(text || '{}'); msg = j?.message || j?.error || msg; } catch (error) { console.error(error); }
        // Debug: konsola durum ve header bilgisini not düş
        if (typeof window !== 'undefined') {
          console.warn('Admin influencers list fetch failed', { status: res.status, body: text });
        }
        throw new Error(msg || (res.status === 404 ? 'Endpoint not found' : 'Listeleme hatası'));
      }

      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch (error) { console.error(error); }
      
      // JSON yapısına göre uygun veriyi al
      const list: InfluencerRow[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : json?.influencers || []);
      
      setRows((list || []).map((r: any) => ({
        id: Number(r?.id),
        name: String(r?.name || r?.full_name || ''),
        email: String(r?.email || ''),
        brand_name: r?.brand_name || null,
        status: (r?.status || 'approved') as any,
        codes: Array.isArray(r?.codes) ? r.codes.map((code: any) => ({
          code: String(code?.code || ''),
          is_active: !!code?.is_active
        })) : [],
        created_at: r?.created_at
      })));
      
      setTotal(Number.isFinite(json?.total) ? Number(json.total) : null);
    } catch (e: any) {
      setError(e?.message || 'Listeleme başarısız.');
    } finally {
      setBusy(false);
    }
  }

  // İlk yükleme ve filtre değişikliklerinde listeyi getir
  useEffect(() => { fetchList(); }, [page, limit, search, startDate, endDate]);

  // Filtreleri uygula
  function onApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }

  // Filtreleri temizle
  function onClearFilters() {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchList();
  }

  // Sayfa sayısı hesapla
  const pages = useMemo(() => {
    if (!total || total <= 0) return null;
    return Math.ceil(total / limit);
  }, [total, limit]);

  // Export işlemleri
  async function exportData(format: 'csv' | 'xlsx') {
    try {
      const params = new URLSearchParams();
      
      // Arama parametresi
      if (search.trim()) params.set('search', search.trim());
      
      // Tarih aralığı parametreleri
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      
      // Format parametresi
      params.set('format', format);
      
      // Export endpoint'ine istek gönder
      const res = await fetch(`/api/influencers/export?${params.toString()}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      if (!res.ok) {
        throw new Error('Export işlemi başarısız oldu');
      }
      
      // Dosyayı indir
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `influencers.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Export işlemi başarısız oldu');
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Influencerlar</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => exportData('csv')}
            className="text-sm rounded-md border px-3 py-2 hover:bg-white/10"
          >
            CSV Export
          </button>
          <button 
            onClick={() => exportData('xlsx')}
            className="text-sm rounded-md border px-3 py-2 hover:bg-white/10"
          >
            Excel Export
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <form onSubmit={onApplyFilters} className="rounded-md border card-like p-4 grid gap-3 sm:grid-cols-1 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-muted mb-1">Ara (kod, marka adı, ad soyad, e-posta)</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kod, marka adı, ad soyad veya e-posta"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm text-muted mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm text-muted mb-1">Bitiş Tarihi</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        
        <div className="md:col-span-4 flex items-end gap-2">
          <button type="submit" className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Uygula</button>
          <button type="button" onClick={onClearFilters} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </form>

      {/* Sayfalama seçenekleri */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sayfa başına:</span>
          <select 
            value={limit} 
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

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
                <th className="px-4 py-2 text-left">Kayıt Tarihi</th>
                <th className="px-4 py-2 text-left">Influencer Kodu</th>
                <th className="px-4 py-2 text-left">Kod Durumu</th>
                <th className="px-4 py-2 text-left">Marka Adı</th>
                <th className="px-4 py-2 text-left">Ad Soyad</th>
                <th className="px-4 py-2 text-left">E-posta</th>
                <th className="px-4 py-2 text-left">Bakiye</th>
                <th className="px-4 py-2 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {busy ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Yükleniyor…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sonuç yok</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {r.codes && r.codes.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {r.codes.map((code, index) => (
                          <span 
                            key={index} 
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              code.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {code.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {r.codes && r.codes.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {r.codes.map((code, index) => (
                          <span 
                            key={index} 
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              code.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {code.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2">{r.brand_name || '—'}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">
                    <BalanceCell influencerId={r.id} />
                  </td>
                  <td className="px-4 py-2">
                    <a href={`/admin/influencers/${r.id}`} className="text-blue-600 hover:text-blue-800">Detay</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfalama */}
      {pages && pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div>Toplam sayfa: {pages}</div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              className="rounded-md border px-3 py-1 disabled:opacity-50"
            >
              Önceki
            </button>
            <span>Sayfa {page}</span>
            <button 
              disabled={page >= pages} 
              onClick={() => setPage((p) => Math.min(pages, p + 1))} 
              className="rounded-md border px-3 py-1 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </main>
  );
}