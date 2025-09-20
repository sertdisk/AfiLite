'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { searchInfluencers, postAdminPayout, getAdminPayouts, adminUpdatePayout } from '@/lib/api';

// --- Helper Components ---

// Influencer arama bileşeni
function InfluencerSearch({ onInfluencerSelect, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearch = (searchQuery) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setSearchTimeout(setTimeout(async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchInfluencers(searchQuery);
        setResults(res.items || []);
      } catch (error) {
        console.error('Influencer search failed:', error);
        setResults([]);
      }
      setLoading(false);
    }, 300)); // Debounce search
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Influencer ara (ad, email)..."
        className="w-full rounded-md border px-3 py-2"
      />
      {loading && <div className="p-2 text-sm text-gray-500">Aranıyor...</div>}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {results.map((inf) => (
            <li 
              key={inf.id}
              onClick={() => {
                onInfluencerSelect(inf);
                setQuery(inf.name);
                setResults([]);
              }}
              className="p-2 hover:bg-gray-800 cursor-pointer"
            >
              {inf.name} ({inf.email})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Yeni ödeme formu
function PayoutForm({ onPayoutCreated }) {
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleInfluencerSelect = (influencer) => {
    setSelectedInfluencer(influencer);
    // TODO: Get influencer's primary IBAN if available from a detailed influencer object
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInfluencer) {
      setError('Lütfen bir influencer seçin.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await postAdminPayout({
        influencerId: selectedInfluencer.id,
        amount: Number(amount),
        iban,
        note,
      });
      setMessage('Ödeme başarıyla oluşturuldu.');
      setSelectedInfluencer(null);
      setAmount('');
      setIban('');
      setNote('');
      if(onPayoutCreated) onPayoutCreated();
    } catch (err) {
      setError(err.message || 'Ödeme oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border card-like p-4">
      <h2 className="text-lg font-semibold mb-3">Yeni Ödeme Girişi</h2>
      {error && <div className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</div>}
      {message && <div className="text-green-500 bg-green-100 p-3 rounded-md mb-4">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-muted mb-1">Influencer</label>
            <InfluencerSearch onInfluencerSelect={handleInfluencerSelect} initialQuery={selectedInfluencer?.name || ''} />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">IBAN</label>
            <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="TR..." required />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Tutar (₺)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="0.00" required />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm text-muted mb-1">Not</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="(Opsiyonel)" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-[#1f2937]">
          {saving ? 'Oluşturuluyor...' : 'Ödeme Oluştur'}
        </button>
      </form>
    </div>
  );
}

// Ödeme düzenleme modalı
function EditPayoutModal({ payout, isOpen, onClose, onSave }) {
  const [note, setNote] = useState(payout?.note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payout) {
      setNote(payout.note || '');
    }
  }, [payout]);

  if (!isOpen || !payout) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(payout.id, { note });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md card-like">
        <h2 className="text-lg font-semibold mb-4">Ödeme Düzenle (ID: {payout.id})</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Not</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2" rows={3}></textarea>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">İptal</button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Ana Sayfa Bileşeni ---

export default function AdminPayoutsPage() {
  const [filters, setFilters] = useState({ influencer: null, startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingPayout, setEditingPayout] = useState(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        influencerId: filters.influencer?.id,
        from: filters.startDate,
        to: filters.endDate,
        page,
        limit,
      };
      const data = await getAdminPayouts(params);
      setPayouts(data.items || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleSavePayout = async (id, payload) => {
    setError(null);
    try {
      await adminUpdatePayout(id, payload);
      fetchPayouts(); // Refresh list
    } catch (error) {
      setError(error.message);
    }
  };

  const handleExport = (format) => {
    const params = new URLSearchParams();
      if (filters.influencer) params.set('influencer_id', filters.influencer.id);
      if (filters.startDate) params.set('start_date', filters.startDate);
      if (filters.endDate) params.set('end_date', filters.endDate);
      params.set('format', format);
      // Direct call to backend for file download
      const baseUrl = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:5003';
      window.open(`${baseUrl}/api/payouts/export?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Ödeme Yönetimi</h1>

      <PayoutForm onPayoutCreated={fetchPayouts} />

      <div className="rounded-md border card-like p-4">
        <h2 className="text-lg font-semibold mb-3">Ödemeleri Filtrele</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-2">
                <label className="block text-sm text-muted mb-1">Influencer</label>
                <InfluencerSearch 
                  onInfluencerSelect={(inf) => setFilters({...filters, influencer: inf, page: 1})} 
                  initialQuery={filters.influencer?.name || ''}
                />
            </div>
            <div>
                <label className="block text-sm text-muted mb-1">Başlangıç Tarihi</label>
                <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})} className="w-full rounded-md border px-3 py-2" />
            </div>
            <div>
                <label className="block text-sm text-muted mb-1">Bitiş Tarihi</label>
                <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value, page: 1})} className="w-full rounded-md border px-3 py-2" />
            </div>
        </div>
         <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setFilters({ influencer: null, startDate: '', endDate: '' })} className="rounded-md border px-4 py-2 text-sm">Filtreyi Temizle</button>
        </div>
      </div>

      <div className="rounded-md border card-like p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Ödeme Listesi</h2>
            <div className="flex items-center gap-2">
                <button onClick={() => handleExport('csv')} className="text-sm rounded-md border px-3 py-2 hover:bg-gray-800">CSV Export</button>
                <button onClick={() => handleExport('xlsx')} className="text-sm rounded-md border px-3 py-2 hover:bg-gray-800">Excel Export</button>
            </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted">Sayfa başına:</span>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-md border px-2 py-1 text-sm">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">Hata: {error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">Influencer</th>
                <th className="px-4 py-2 text-left">IBAN</th>
                <th className="px-4 py-2 text-right">Tutar</th>
                <th className="px-4 py-2 text-right">Önceki Bakiye</th>
                <th className="px-4 py-2 text-right">Sonraki Bakiye</th>
                <th className="px-4 py-2 text-left">Not</th>
                <th className="px-4 py-2 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10">Yükleniyor...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10">Filtreye uygun ödeme bulunamadı.</td></tr>
              ) : (
                payouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-gray-800">
                    <td className="px-4 py-2">{new Date(payout.created_at).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-2">{payout.influencer_name}</td>
                    <td className="px-4 py-2 font-mono">{payout.iban}</td>
                    <td className="px-4 py-2 text-right">{(payout.amount || 0).toFixed(2)} ₺</td>
                    <td className="px-4 py-2 text-right">{(payout.balance_before || 0).toFixed(2)} ₺</td>
                    <td className="px-4 py-2 text-right">{(payout.balance_after || 0).toFixed(2)} ₺</td>
                    <td className="px-4 py-2">{payout.note}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => setEditingPayout(payout)} className="text-blue-600 hover:underline">Düzenle</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      <EditPayoutModal 
        payout={editingPayout}
        isOpen={!!editingPayout}
        onClose={() => setEditingPayout(null)}
        onSave={handleSavePayout}
      />
    </main>
  );
}