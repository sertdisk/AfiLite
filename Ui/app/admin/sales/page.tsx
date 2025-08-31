
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import QuickSaleForm from '../(protected)/dashboard/components/QuickSaleForm';
import EditSaleModal from '../_components/EditSaleModal';

// Veri tipleri
type Sale = {
  id: number;
  influencer_code: string;
  influencer_brand_name: string;
  customer_url: string;
  product_info: string;
  sale_amount: number;
  commission_amount: number;
  created_at: string;
};

export default function AdminSalesPage() {
  // Filtreler
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sayfalama
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Veri ve durum yönetimi
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal yönetimi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Veri çekme fonksiyonu
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (influencerSearch) params.set('influencer', influencerSearch);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Satış verileri alınamadı.');
      }
      const data = await res.json();

      // Backend'den gelen veriyi frontend'in beklediği formata dönüştür
      const transformedItems = (data.items || []).map((sale: any) => ({
        id: sale.id,
        influencer_code: sale.code,
        influencer_brand_name: sale.influencer_brand_name,
        customer_url: sale.customer_url,
        product_info: sale.product,
        sale_amount: sale.total_amount,
        commission_amount: sale.commission,
        created_at: sale.recorded_at,
      }));

      setSales(transformedItems);
      setTotal(data.pagination?.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [influencerSearch, startDate, endDate, page, limit]);

  // Filtre veya sayfa değiştiğinde verileri yeniden çek
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchSales();
  };

  const handleClearFilters = () => {
    setInfluencerSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    // useEffect will then trigger fetchSales
  };

  // Satış düzenleme modalını aç
  const handleEditClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  // Satışı kaydetme (modal'dan çağrılır)
  const handleSaveSale = async (updatedSale: Sale) => {
    // Burada API'ye PUT/PATCH isteği atılacak
    const res = await fetch(`/api/sales/${updatedSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSale),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Satış güncellenemedi.');
    }
    
    // Verileri yenile
    fetchSales();
  };

  // Export fonksiyonu
  const exportData = async (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    if (influencerSearch) params.set('influencer', influencerSearch);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    params.set('format', format);

    window.open(`/api/sales/export?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Satış Yönetimi</h1>

      {/* Hızlı Satış Ekleme Formu */}
      <QuickSaleForm />

      {/* Filtreleme Alanı */}
      <div className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Satışları Filtrele</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-2">
                <label className="block text-sm text-muted mb-1">Influencer Ara (Kod, Marka Adı)</label>
                <input
                    type="text"
                    value={influencerSearch}
                    onChange={(e) => setInfluencerSearch(e.target.value)}
                    placeholder="Influencer kodu veya marka adı girin..."
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
        </div>
        <div className="mt-4 flex items-center gap-2">
            <button onClick={handleApplyFilters} className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">Filtrele</button>
            <button onClick={handleClearFilters} className="rounded-md border px-4 py-2 text-sm">Temizle</button>
        </div>
      </div>

      {/* Liste ve Export Butonları */}
      <div className="rounded-md border card-like p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Satış Listesi</h2>
            <div className="flex items-center gap-2">
                <button onClick={() => exportData('csv')} className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">CSV Export</button>
                <button onClick={() => exportData('xlsx')} className="text-sm rounded-md border px-3 py-2 hover:bg-white/10">Excel Export</button>
            </div>
        </div>

        {/* Sayfalama Seçenekleri */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted">Sayfa başına:</span>
          <select 
            value={limit} 
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">Hata: {error}</p>}

        {/* Satış Tablosu */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">Influencer Kodu</th>
                <th className="px-4 py-2 text-left">Marka Adı</th>
                <th className="px-4 py-2 text-left">Müşteri</th>
                <th className="px-4 py-2 text-left">Ürün</th>
                <th className="px-4 py-2 text-right">Tutar</th>
                <th className="px-4 py-2 text-right">Komisyon</th>
                <th className="px-4 py-2 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10">Yükleniyor...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10">Filtreye uygun satış bulunamadı.</td></tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(sale.created_at).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-2 font-mono">{sale.influencer_code}</td>
                    <td className="px-4 py-2">{sale.influencer_brand_name}</td>
                    <td className="px-4 py-2">{sale.customer_url}</td>
                    <td className="px-4 py-2">{sale.product_info}</td>
                    <td className="px-4 py-2 text-right">{(sale.sale_amount ?? 0).toFixed(2)} ₺</td>
                    <td className="px-4 py-2 text-right">{(sale.commission_amount ?? 0).toFixed(2)} ₺</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => handleEditClick(sale)} className="text-blue-600 hover:underline">Düzenle</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama Kontrolleri */}
        {total > 0 && (
            <div className="flex justify-between items-center mt-4 text-sm">
                <div>Toplam {total} kayıt bulundu.</div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border px-3 py-1 disabled:opacity-50">Önceki</button>
                    <span>Sayfa {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border px-3 py-1 disabled:opacity-50">Sonraki</button>
                </div>
            </div>
        )}
      </div>

      {/* Satış Düzenleme Modalı */}
      <EditSaleModal 
        sale={selectedSale}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSale}
      />
    </main>
  );
}
