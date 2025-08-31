'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAdminCodes, putAdminCode, AdminCode, AdminCodeUpdatePayload } from '@/lib/api';

// --- Helper Components ---

const DebouncedInput = ({ value: initialValue, onChange, debounce = 500, ...props }: { value: string | number, onChange: (value: string | number) => void, debounce?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (value !== initialValue) {
                onChange(value);
            }
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, initialValue, onChange, debounce]);

    return <input {...props} value={value} onChange={e => setValue(e.target.value)} />;
};

// --- Child Components ---

const PendingCodesSection = ({ onApprovalSuccess }: { onApprovalSuccess: () => void }) => {
    const [pendingCodes, setPendingCodes] = useState<AdminCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputs, setInputs] = useState<{ [key: number]: { discount: string; commission: string } }>({});

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminCodes({ isActive: false, limit: 100 }); // Get up to 100 pending codes
            setPendingCodes(data.items);
            const initialInputs: { [key: number]: { discount: string; commission: string } } = {};
            data.items.forEach(code => {
                initialInputs[code.id] = { discount: '10', commission: '40' }; // Default values
            });
            setInputs(initialInputs);
        } catch (error) {
            console.error("Failed to fetch pending codes:", error);
            alert("Onay bekleyen kodlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const handleApprove = async (codeId: number) => {
        const codeInput = inputs[codeId];
        if (!codeInput.discount || !codeInput.commission) {
            return alert('İndirim ve komisyon yüzdeleri zorunludur.');
        }
        try {
            await putAdminCode(codeId, {
                is_active: true,
                discount_pct: Number(codeInput.discount),
                commission_pct: Number(codeInput.commission),
            });
            alert('Kod onaylandı!');
            onApprovalSuccess(); // Refresh all data on parent
        } catch (error) {
            console.error("Failed to approve code:", error);
            alert(`Kod onaylanamadı: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    if (loading) return <div>Yükleniyor...</div>;
    if (pendingCodes.length === 0) return null; // Don't show the section if there are no pending codes

    return (
        <section className="mb-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Onay Bekleyen Kodlar</h2>
            <ul className="space-y-4">
                {pendingCodes.map(code => (
                    <li key={code.id} className="p-3 bg-gray-50 rounded-md flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="font-bold text-lg">{code.code}</p>
                            <p className="text-sm text-gray-600">{code.influencer_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex flex-col"><span className="text-xs text-gray-500">İndirim %</span><input type="number" value={inputs[code.id]?.discount || ''} onChange={e => setInputs(prev => ({ ...prev, [code.id]: { ...prev[code.id], discount: e.target.value } }))} className="w-24 p-2 border rounded-md" /></label>
                            <label className="flex flex-col"><span className="text-xs text-gray-500">Komisyon %</span><input type="number" value={inputs[code.id]?.commission || ''} onChange={e => setInputs(prev => ({ ...prev, [code.id]: { ...prev[code.id], commission: e.target.value } }))} className="w-24 p-2 border rounded-md" /></label>
                            <button onClick={() => handleApprove(code.id)} className="self-end px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Onayla</button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
};

const AllCodesList = () => {
    const [codes, setCodes] = useState<AdminCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminCodes({ page, limit, startDate, endDate, isActive: true });
            setCodes(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error("Failed to fetch codes:", error);
            alert("Kodlar yüklenemedi.");
        }
        setLoading(false);
    }, [page, limit, startDate, endDate]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleUpdateCode = async (id: number, payload: AdminCodeUpdatePayload) => {
        try {
            await putAdminCode(id, payload);
            // No alert on success for inline edits to avoid being noisy
        } catch (error) {
            console.error("Failed to update code:", error);
            alert(`Kod güncellenemedi: ${error instanceof Error ? error.message : String(error)}`);
            fetchCodes(); // Re-fetch to revert optimistic update
        }
    };

    const handleExport = () => {
        if (codes.length === 0) return alert("Dışa aktarılacak veri yok.");
        const headers = ["Influencer Kodu", "Aktif/Pasif", "Influencer Marka Adı", "Influencer Ad Soyad", "Influencer E-posta", "İndirim %", "Komisyon %", "Oluşturulma Tarihi"];
        const csvContent = [
            headers.join(','),
            ...codes.map(c => [
                c.code,
                c.is_active ? 'Aktif' : 'Pasif',
                c.brand_name || 'N/A',
                c.influencer_name || 'N/A',
                c.influencer_email || 'N/A',
                c.discount_pct,
                c.commission_pct,
                new Date(c.created_at).toLocaleDateString() // Format date for CSV
            ].join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'kodlar.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const groupedCodes = codes.reduce((acc, code) => {
        const key = code.influencer_id ?? 'unassigned';
        if (!acc[key]) {
            acc[key] = { influencer_name: code.influencer_name, influencer_email: code.influencer_email, brand_name: code.brand_name, codes: [] };
        }
        acc[key].codes.push(code);
        return acc;
    }, {} as { [key: string]: { influencer_name?: string; influencer_email?: string; brand_name?: string; codes: AdminCode[] } });

    return (
        <section className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Tüm Kodlar</h2>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <label>Tarih Başlangıç: <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md" /></label>
                    <label>Tarih Bitiş: <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md" /></label>
                </div>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Dışa Aktar (CSV)</button>
            </div>

            {loading ? <div>Yükleniyor...</div> : (
                <div className="space-y-6">
                    {Object.values(groupedCodes).map(group => (
                        <div key={group.influencer_email} className="border rounded-md p-4">
                            <h3 className="font-semibold">{group.influencer_name} ({group.brand_name})</h3>
                            <p className="text-sm text-gray-500 mb-2">{group.influencer_email}</p>
                            <table className="min-w-full text-sm">
                                <thead className="text-left bg-gray-50">
                                    <tr>
                                        <th className="p-2">Kod</th>
                                        <th className="p-2">Durum</th>
                                        <th className="p-2">İndirim %</th>
                                        <th className="p-2">Komisyon %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.codes.map(code => (
                                        <tr key={code.id} className="border-t">
                                            <td className="p-2 font-mono">{code.code}</td>
                                            <td className="p-2"><input type="checkbox" checked={code.is_active} onChange={e => handleUpdateCode(code.id, { is_active: e.target.checked })} /></td>
                                            <td className="p-2"><DebouncedInput type="number" value={code.discount_pct} onChange={val => handleUpdateCode(code.id, { discount_pct: Number(val) })} className="w-24 p-1 border rounded-md" /></td>
                                            <td className="p-2"><DebouncedInput type="number" value={code.commission_pct} onChange={val => handleUpdateCode(code.id, { commission_pct: Number(val) })} className="w-24 p-1 border rounded-md" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex justify-between items-center">
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="p-2 border rounded-md">
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-md disabled:opacity-50">Önceki</button>
                    <span>Sayfa {page} / {Math.ceil(total / limit)}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-4 py-2 border rounded-md disabled:opacity-50">Sonraki</button>
                </div>
            </div>
        </section>
    );
};

// --- Main Page Component ---

export default function AdminCodesPage() {
    // This key is used to force a re-render of the AllCodesList when a pending code is approved.
    const [listKey, setListKey] = useState(0);

    const handleRefresh = () => {
        setListKey(prev => prev + 1);
    };

    return (
        <main className="p-4 sm:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Kod Yönetimi</h1>
            <PendingCodesSection onApprovalSuccess={handleRefresh} />
            <AllCodesList key={listKey} />
        </main>
    );
}
