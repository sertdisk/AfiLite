'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAdminCodes, putAdminCode, AdminCode, AdminCodeUpdatePayload } from '@/lib/api';

// --- Main Page Component ---
export default function AdminCodesPage() {
    const [codes, setCodes] = useState<AdminCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [filters, setFilters] = useState({ 
        search: '',
        startDate: '',
        endDate: '',
        status: 'all' // all, active, pending
    });
    const [error, setError] = useState<string | null>(null);

    // State for inline editing
    const [editingCodeId, setEditingCodeId] = useState<number | null>(null);
    const [editedData, setEditedData] = useState<Partial<AdminCode>>({});

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const isActive = filters.status === 'all' ? undefined : filters.status === 'active';
            const data = await getAdminCodes({ 
                page, 
                limit, 
                startDate: filters.startDate, 
                endDate: filters.endDate, 
                search: filters.search, 
                isActive 
            });
            setCodes(data.items || []);
            setTotal(data.total || 0);
        } catch (err: any) {
            setError(err.message || "Kodlar yüklenemedi.");
        }
        setLoading(false);
    }, [page, limit, filters]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleEditClick = (code: AdminCode) => {
        setEditingCodeId(code.id);
        setEditedData({
            discount_pct: code.discount_pct,
            commission_pct: code.commission_pct,
            is_active: code.is_active,
        });
    };

    const handleCancelEdit = () => {
        setEditingCodeId(null);
        setEditedData({});
    };

    const handleSaveEdit = async () => {
        if (!editingCodeId) return;
        try {
            await putAdminCode(editingCodeId, editedData as AdminCodeUpdatePayload);
            setEditingCodeId(null);
            fetchCodes(); // Refresh data after save
        } catch (error) {
            setError(`Kod güncellenemedi: ${error.message}`);
        }
    };

    const handleApproveCode = async (id: number) => {
        const discount = prompt("Onaylamak için indirim % girin:", "10");
        if (discount === null) return; // User cancelled
        const commission = prompt("Komisyon % girin:", "40");
        if (commission === null) return; // User cancelled
        
        try {
            await putAdminCode(id, { 
                is_active: true, 
                discount_pct: Number(discount), 
                commission_pct: Number(commission) 
            });
            fetchCodes(); // Refresh list
        } catch (error) {
            setError(`Kod onaylanamadı: ${error.message}`);
        }
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.startDate) params.set('startDate', filters.startDate);
        if (filters.endDate) params.set('endDate', filters.endDate);
        const isActive = filters.status === 'all' ? undefined : filters.status === 'active';
        if (isActive !== undefined) params.set('isActive', String(isActive));
        params.set('format', format);

        const baseUrl = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:5003';
        window.open(`${baseUrl}/api/codes/export?${params.toString()}`, '_blank');
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <main className="space-y-6 p-4 sm:p-6">
            <h1 className="text-2xl font-semibold">Kod Yönetimi</h1>

            {/* Filters */}
            <div className="rounded-md border card-like p-4">
                <h2 className="text-lg font-semibold mb-3">Kodları Filtrele</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm text-muted mb-1">Ara (Kod, Influencer Adı/Email)</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                            placeholder="Arama terimi girin..."
                            className="w-full rounded-md border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-muted mb-1">Durum</label>
                        <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})} className="w-full rounded-md border px-3 py-2">
                            <option value="all">Tümü</option>
                            <option value="active">Aktif</option>
                            <option value="pending">Beklemede</option>
                        </select>
                    </div>
                    <div></div> {/* Spacer */}
                    <div>
                        <label className="block text-sm text-muted mb-1">Başlangıç Tarihi</label>
                        <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})} className="w-full rounded-md border px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm text-muted mb-1">Bitiş Tarihi</label>
                        <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value, page: 1})} className="w-full rounded-md border px-3 py-2" />
                    </div>
                </div>
            </div>

            {/* Code List */}
            <div className="rounded-md border card-like p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Kod Listesi</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('csv')} className="text-sm rounded-md border px-3 py-2 hover:bg-gray-800">CSV Export</button>
                        <button onClick={() => handleExport('xlsx')} className="text-sm rounded-md border px-3 py-2 hover:bg-gray-800">Excel Export</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted">Sayfa başına:</span>
                    <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-md border px-2 py-1 text-sm">
                        <option value={20}>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">Hata: {error}</p>}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-800 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">Kod</th>
                                <th className="px-4 py-2 text-left">Influencer</th>
                                <th className="px-4 py-2 text-right">İndirim %</th>
                                <th className="px-4 py-2 text-right">Komisyon %</th>
                                <th className="px-4 py-2 text-center">Durum</th>
                                <th className="px-4 py-2 text-left">Tarih</th>
                                <th className="px-4 py-2 text-center">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10">Yükleniyor...</td></tr>
                            ) : codes.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10">Filtreye uygun kod bulunamadı.</td></tr>
                            ) : (
                                codes.map(code => (
                                    <tr key={code.id} className={`hover:bg-gray-800 ${editingCodeId === code.id ? 'bg-blue-800' : ''}`}>
                                        <td className="px-4 py-2 font-mono">{code.code}</td>
                                        <td className="px-4 py-2">{code.influencer_name} <span className="text-gray-500">({code.brand_name})</span></td>
                                        <td className="px-4 py-2 text-right">
                                            {editingCodeId === code.id ? (
                                                <input type="number" value={editedData.discount_pct} onChange={e => setEditedData({...editedData, discount_pct: Number(e.target.value)})} className="w-20 p-1 border rounded-md text-right bg-gray-800" />
                                            ) : (
                                                code.discount_pct
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {editingCodeId === code.id ? (
                                                <input type="number" value={editedData.commission_pct} onChange={e => setEditedData({...editedData, commission_pct: Number(e.target.value)})} className="w-20 p-1 border rounded-md text-right bg-gray-800" />
                                            ) : (
                                                code.commission_pct
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {editingCodeId === code.id ? (
                                                <input type="checkbox" checked={!!editedData.is_active} onChange={e => setEditedData({...editedData, is_active: e.target.checked})} />
                                            ) : (
                                                <span className={`px-2 py-1 text-xs rounded-full ${code.is_active ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-200'}`}>
                                                    {code.is_active ? 'Aktif' : 'Beklemede'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{new Date(code.created_at).toLocaleDateString('tr-TR')}</td>
                                        <td className="px-4 py-2 text-center">
                                            {editingCodeId === code.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={handleSaveEdit} className="text-green-600 hover:underline text-xs">Kaydet</button>
                                                    <button onClick={handleCancelEdit} className="text-red-600 hover:underline text-xs">İptal</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditClick(code)} className="text-blue-600 hover:underline text-xs">Düzenle</button>
                                                    {!code.is_active && (
                                                        <button onClick={() => handleApproveCode(code.id)} className="text-green-600 hover:underline text-xs">Onayla</button>
                                                    )}
                                                </div>
                                            )}
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
        </main>
    );
}
