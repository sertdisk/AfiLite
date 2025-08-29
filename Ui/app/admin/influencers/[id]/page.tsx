'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import {
  adminCreateCode,
  postAdminSale,
  adminListInfluencerCodes,
  getAdminSales,
  updateAdminSale,
  patchAdminInfluencerDetail,
  getAdminPayouts,
  postAdminPayout,
  putAdminCode
} from '@/lib/api';

// --- TİPLER ---
type SocialAccount = { id: number; platform: string; handle: string; url?: string; is_active: boolean; };
type PaymentAccount = { id: number; bank_name: string; account_holder_name: string; iban: string; is_active: boolean; };
type InflDetail = { id: number; full_name: string; email: string; phone?: string; status: 'pending' | 'approved' | 'rejected' | 'suspended'; niche?: string; country?: string; about?: string | null; website?: string | null; brand_name?: string | null; tax_type?: 'individual' | 'company'; social_accounts: SocialAccount[]; payment_accounts: PaymentAccount[]; };
type CodeRow = { id: number; code: string; discount_pct?: number; commission_pct?: number; is_active?: boolean | number; };
type SaleRow = { id: number; recorded_at?: string | null; code: string; customer_url?: string | null; product?: string | null; total_amount?: number | null; commission?: number | null; note?: string | null; };
type PayoutRow = { id: number; amount: number; status: string; created_at: string; note?: string; iban?: string; balance_before?: number; balance_after?: number; };

// --- YARDIMCI BİLEŞENLER ---

function AddCodeSection({ influencerId, onCodeAdded }: { influencerId: number; onCodeAdded: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [code, setCode] = useState('');
    const [discountPct, setDiscountPct] = useState('10');
    const [commissionPct, setCommissionPct] = useState('10');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await adminCreateCode({ influencer_id: influencerId, code: code || undefined, discount_percentage: Number(discountPct), commission_pct: Number(commissionPct) });
            setCode('');
            setIsOpen(false);
            onCodeAdded();
        } catch (err: any) {
            setError(err?.message || 'Kod eklenemedi');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-4">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm rounded-md bg-gray-800 text-white px-3 py-2 hover:bg-gray-700">{isOpen ? 'Formu Kapat' : 'Yeni Kod Ekle'}</button>
            {isOpen && (
                <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 border rounded-md bg-gray-50">
                    {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="block text-sm text-gray-600 mb-1">Kod (Opsiyonel)</label><input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="Otomatik" /></div>
                        <div><label className="block text-sm text-gray-600 mb-1">İndirim %</label><input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="w-full rounded-md border px-3 py-2" required /></div>
                        <div><label className="block text-sm text-gray-600 mb-1">Komisyon %</label><input type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} className="w-full rounded-md border px-3 py-2" required /></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Ekleniyor…' : 'Ekle'}</button>
                        <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border px-4 py-2 text-sm">İptal</button>
                    </div>
                </form>
            )}
        </div>
    );
}

function QuickSaleForm({ influencerId, codes, onSaleAdded, onCancel }: { influencerId: number; codes: CodeRow[]; onSaleAdded: () => void; onCancel: () => void; }) {
    const [code, setCode] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [customer, setCustomer] = useState('');
    const [product, setProduct] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const active = (codes || []).filter(c => c.is_active);
        if (active.length > 0 && !code) setCode(String(active[0].code));
    }, [codes, code]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const amountNum = Number(amount);
            if (!code) throw new Error('Kod seçiniz');
            if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Geçerli tutar giriniz');
            await postAdminSale({ code, amount: amountNum, customer_url: customer, product, note });
            onSaleAdded();
            onCancel();
        } catch (err: any) {
            setError(err.message || 'Satış kaydedilemedi');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 border rounded-md bg-gray-50">
            {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Kod</label><select value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm" required><option value="">— Kod Seç —</option>{(codes || []).filter(c => c.is_active).map(c => (<option key={c.id} value={c.code}>{c.code}</option>))}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tutar (TRY)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm" placeholder="0.00" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label><input value={customer} onChange={e => setCustomer(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm" placeholder="(Opsiyonel)" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Ürün</label><input value={product} onChange={e => setProduct(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm" placeholder="(Opsiyonel)" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Not</label><input value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm" placeholder="(Opsiyonel)" /></div>
            </div>
            <div className="flex items-center gap-2">
                <button type="submit" disabled={saving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{saving ? 'Ekleniyor…' : 'Satış Ekle'}</button>
                <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">İptal</button>
            </div>
        </form>
    );
}

function AddPayoutSection({ influencerId, influencerIban, onPayoutAdded }: { influencerId: number; influencerIban?: string; onPayoutAdded: () => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [iban, setIban] = useState(influencerIban || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setIban(influencerIban || ''); }, [influencerIban]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const amountNum = Number(amount);
            if (!iban) throw new Error('IBAN adresi gerekli');
            if (!Number.isFinite(amountNum) || amountNum <= 0) throw new Error('Geçerli tutar giriniz');
            await postAdminPayout({ influencerId, amount: amountNum, iban, note, status: 'pending' });
            setAmount(''); setNote('');
            setIsOpen(false);
            onPayoutAdded();
        } catch (err: any) {
            setError(err.message || 'Ödeme oluşturulamadı');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-4">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-sm rounded-md bg-gray-800 text-white px-3 py-2 hover:bg-gray-700">{isOpen ? 'Formu Kapat' : 'Yeni Ödeme Oluştur'}</button>
            {isOpen && (
                <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 border rounded-md bg-gray-50">
                    {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2"><label className="block text-sm text-gray-600 mb-1">IBAN</label><input value={iban} onChange={e => setIban(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="TR..." required /></div>
                        <div><label className="block text-sm text-gray-600 mb-1">Tutar (TRY)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="0.00" required /></div>
                        <div className="sm:col-span-3"><label className="block text-sm text-gray-600 mb-1">Açıklama</label><input value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="(Opsiyonel)" /></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Oluşturuluyor…' : 'Oluştur'}</button>
                        <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border px-4 py-2 text-sm">İptal</button>
                    </div>
                </form>
            )}
        </div>
    );
}

// --- ANA SAYFA BİLEŞENİ ---
export default function AdminInfluencerDetailPage({ params }: { params: { id: string } }) {
    const [detail, setDetail] = useState<InflDetail | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Partial<InflDetail>>({});
    const [codes, setCodes] = useState<CodeRow[]>([]);
    const [editingCode, setEditingCode] = useState<Partial<CodeRow> | null>(null);
    const [sales, setSales] = useState<SaleRow[]>([]);
    const [editingSale, setEditingSale] = useState<Partial<SaleRow> | null>(null);
    const [payouts, setPayouts] = useState<PayoutRow[]>([]);
    const [showSaleForm, setShowSaleForm] = useState(false);

    const inflId = use(params).id;

    const loadAll = useCallback(async () => {
        if (!inflId) return;
        setBusy(true);
        try {
            const detailRes = await fetch(`/api/v1/influencers/${encodeURIComponent(inflId)}`, { credentials: 'include' });
            const detailData = await detailRes.json();
            if (!detailRes.ok) throw new Error(detailData.message || 'Detaylar yüklenemedi');
            setDetail(detailData.influencer || detailData);
            setForm(detailData.influencer || detailData);

            const codesRes = await adminListInfluencerCodes(Number(inflId));
            setCodes(codesRes.codes || []);

            const salesRes = await getAdminSales({ influencerId: Number(inflId), limit: 20 });
            setSales(salesRes.items || []);

            const payoutsRes = await getAdminPayouts({ influencerId: Number(inflId), limit: 20 });
            setPayouts(payoutsRes.items || []);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }, [inflId]);

    useEffect(() => { loadAll(); }, [inflId]);

    const handleSaveProfile = async () => {
        if (!inflId) return;
        setBusy(true);
        try {
            await patchAdminInfluencerDetail(inflId, form);
            setEditing(false);
            loadAll();
        } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };

    const handleSaveCode = async () => {
        if (!editingCode || !editingCode.id) return;
        setBusy(true);
        try {
            await putAdminCode(editingCode.id, { commission_pct: Number(editingCode.commission_pct), discount_pct: Number(editingCode.discount_pct) });
            setEditingCode(null);
            loadAll();
        } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };

    const handleSaveSale = async () => {
        if (!editingSale || !editingSale.id) return;
        setBusy(true);
        try {
            await updateAdminSale(editingSale.id, { total_amount: Number(editingSale.total_amount), customer_url: editingSale.customer_url, product: editingSale.product, note: editingSale.note });
            setEditingSale(null);
            loadAll();
        } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };

    return (
        <main className="space-y-6 p-4 sm:p-6">
            <h1 className="text-2xl font-semibold">{detail?.full_name || 'Influencer Detayı'}</h1>
            {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm mb-4">{error}</div>}
            {busy && !detail && <div className="text-gray-600">Yükleniyor…</div>}

            {!busy && !error && detail && (
                <>
                    <section className="rounded-md border p-4 space-y-4">
                        <h2 className="text-lg font-semibold cursor-pointer" onClick={() => setEditing(!editing)}>Genel Bilgiler</h2>
                        {editing && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700">Ad Soyad</label><input value={form.full_name ?? ''} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">E‑posta</label><input value={form.email ?? ''} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Telefon</label><input value={form.phone ?? ''} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Marka Adı</label><input value={form.brand_name ?? ''} onChange={(e) => setForm({...form, brand_name: e.target.value})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" /></div>
                                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700">Hakkında</label><textarea value={form.about ?? ''} onChange={(e) => setForm({...form, about: e.target.value})} rows={3} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" /></div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-gray-700">Durum</label><select value={form.status ?? ''} onChange={(e) => setForm({...form, status: e.target.value as any})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm" ><option value="approved">Aktif</option><option value="pending">Beklemede</option><option value="rejected">Reddedildi</option><option value="suspended">Askıda</option></select></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Vergi Tipi</label><select value={form.tax_type ?? ''} onChange={(e) => setForm({...form, tax_type: e.target.value as any})} className="w-full mt-1 rounded-md border-gray-300 shadow-sm"><option value="individual">Bireysel</option><option value="company">Şirket</option></select></div>
                                </div>
                                <div className="md:col-span-3 pt-4 border-t"><h3 className="text-md font-semibold mb-2">Platformlar</h3><div className="space-y-1">{detail.social_accounts?.map(acc => <div key={acc.id} className="text-sm p-2 border-b"><b>{acc.platform}:</b> {acc.handle}</div>) || <div className="text-sm text-gray-500">Platform eklenmemiş.</div>}</div></div>
                                <div className="md:col-span-3 pt-4 border-t"><h3 className="text-md font-semibold mb-2">Ödeme Hesapları</h3><div className="space-y-1">{detail.payment_accounts?.map(acc => <div key={acc.id} className={`text-sm p-2 border-b ${acc.is_active ? 'bg-green-100' : ''}`}><b>{acc.bank_name}:</b> {acc.iban} {acc.is_active && '(Aktif)'}</div>) || <div className="text-sm text-gray-500">Ödeme hesabı eklenmemiş.</div>}</div></div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 pt-4 border-t mt-4">
                            {!editing ? <button onClick={() => setEditing(true)} className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm hover:bg-gray-700">Profili Düzenle</button> : <><button onClick={handleSaveProfile} disabled={busy} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Kaydet'}</button><button onClick={() => { setEditing(false); setForm(detail!); }} className="rounded-md border px-4 py-2 text-sm">İptal</button></>}
                        </div>
                    </section>

                    <section className="rounded-md border p-4 space-y-4">
                        <h2 className="text-lg font-semibold">İndirim Kodları</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">İndirim %</th><th className="px-3 py-2 text-left">Komisyon %</th><th className="px-3 py-2 text-left">Durum</th><th className="px-3 py-2 text-left">İşlem</th></tr></thead>
                                <tbody className="divide-y">{codes.map(c => <tr key={c.id}>{editingCode?.id === c.id ? <><td><input value={editingCode.code} readOnly className="w-full bg-gray-100 px-3 py-2" /></td><td><input type="number" value={editingCode.discount_pct} onChange={e => setEditingCode({...editingCode, discount_pct: Number(e.target.value)})} className="w-20 rounded-md border-gray-300 shadow-sm px-3 py-2" /></td><td><input type="number" value={editingCode.commission_pct} onChange={e => setEditingCode({...editingCode, commission_pct: Number(e.target.value)})} className="w-20 rounded-md border-gray-300 shadow-sm px-3 py-2" /></td><td>{c.is_active ? 'Aktif' : 'Pasif'}</td><td><button onClick={handleSaveCode} className="text-xs bg-blue-600 text-white rounded px-2 py-1">Kaydet</button><button onClick={() => setEditingCode(null)} className="text-xs rounded px-2 py-1 ml-1">İptal</button></td></> : <><td>{c.code}</td><td>{c.discount_pct}%</td><td>{c.commission_pct}%</td><td>{c.is_active ? 'Aktif' : 'Pasif'}</td><td><button onClick={() => setEditingCode(c)} className="text-xs rounded border px-2 py-1">Düzenle</button></td></>}</tr>)}</tbody>
                            </table>
                        </div>
                        <AddCodeSection influencerId={Number(inflId)} onCodeAdded={loadAll} />
                    </section>

                    <section className="rounded-md border p-4 space-y-4">
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Satışlar</h2><button onClick={() => setShowSaleForm(!showSaleForm)} className="text-sm rounded-md bg-gray-800 text-white px-3 py-2 hover:bg-gray-700">{showSaleForm ? 'Formu Kapat' : 'Hızlı Satış Ekle'}</button></div>
                        {showSaleForm && <QuickSaleForm influencerId={Number(inflId)} codes={codes} onSaleAdded={loadAll} onCancel={() => setShowSaleForm(false)} />}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Tarih</th><th className="px-3 py-2 text-left">Kod</th><th className="px-3 py-2 text-left">Müşteri</th><th className="px-3 py-2 text-left">Ürün</th><th className="px-3 py-2 text-right">Tutar</th><th className="px-3 py-2 text-right">Komisyon</th><th className="px-3 py-2 text-left">Not</th><th className="px-3 py-2 text-left">İşlem</th></tr></thead>
                                <tbody className="divide-y">{sales.map(s => <tr key={s.id}>{editingSale?.id === s.id ? <><td>{s.recorded_at ? new Date(s.recorded_at).toLocaleDateString() : ''}</td><td><input value={editingSale.code} readOnly className="w-full bg-gray-100"/></td><td><input value={editingSale.customer_url ?? ''} onChange={e => setEditingSale({...editingSale, customer_url: e.target.value})} className="w-full rounded-md border-gray-300" /></td><td><input value={editingSale.product ?? ''} onChange={e => setEditingSale({...editingSale, product: e.target.value})} className="w-full rounded-md border-gray-300" /></td><td><input type="number" value={editingSale.total_amount ?? ''} onChange={e => setEditingSale({...editingSale, total_amount: Number(e.target.value)})} className="w-full rounded-md border-gray-300" /></td><td className="text-right">{s.commission != null ? `${s.commission.toFixed(2)} TRY` : '-'}</td><td><input value={editingSale.note ?? ''} onChange={e => setEditingSale({...editingSale, note: e.target.value})} className="w-full rounded-md border-gray-300" /></td><td><button onClick={handleSaveSale} className="text-xs bg-blue-600 text-white rounded px-2 py-1">Kaydet</button><button onClick={() => setEditingSale(null)} className="text-xs rounded px-2 py-1 ml-1">İptal</button></td></> : <><td>{s.recorded_at ? new Date(s.recorded_at).toLocaleDateString() : ''}</td><td>{s.code}</td><td>{s.customer_url || '-'}</td><td>{s.product || '-'}</td><td className="text-right">{s.total_amount != null ? `${s.total_amount.toFixed(2)} TRY` : '-'}</td><td className="text-right">{s.commission != null ? `${s.commission.toFixed(2)} TRY` : '-'}</td><td>{s.note || '-'}</td><td><button onClick={() => setEditingSale(s)} className="text-xs rounded border px-2 py-1">Düzenle</button></td></>}</tr>)}</tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-md border p-4 space-y-4">
                        <h2 className="text-lg font-semibold">Ödemeler</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Tarih</th><th className="px-3 py-2 text-left">IBAN</th><th className="px-3 py-2 text-right">Tutar</th><th className="px-3 py-2 text-right">Önceki Bakiye</th><th className="px-3 py-2 text-right">Sonraki Bakiye</th><th className="px-3 py-2 text-left">Durum</th><th className="px-3 py-2 text-left">Not</th></tr></thead>
                                <tbody className="divide-y">{payouts.map(p => <tr key={p.id}><td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td><td className="font-mono">{p.iban}</td><td className="text-right">{p.amount.toFixed(2)} TRY</td><td className="text-right">{p.balance_before?.toFixed(2)} TRY</td><td className="text-right">{p.balance_after?.toFixed(2)} TRY</td><td>{p.status}</td><td>{p.note || '-'}</td></tr>)}</tbody>
                            </table>
                        </div>
                        <AddPayoutSection influencerId={Number(inflId)} influencerIban={detail.payment_accounts.find(p => p.is_active)?.iban} onPayoutAdded={loadAll} />
                    </section>
                </>
            )}
        </main>
    );
}