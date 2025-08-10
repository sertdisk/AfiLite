'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type CodeDetail = {
  id: number;
  code: string;
  discount_percentage?: number; // backend farklı isim döndürebilir
  discount_pct?: number;
  commission_pct: number;
  is_active: boolean;
  influencer_id?: number;
  created_at?: string;
  updated_at?: string;
};

function normalizeDetail(d: any): CodeDetail {
  return {
    id: Number(d?.id),
    code: String(d?.code || ''),
    discount_percentage:
      d?.discount_percentage !== undefined ? Number(d.discount_percentage) : undefined,
    discount_pct: d?.discount_pct !== undefined ? Number(d.discount_pct) : undefined,
    commission_pct: Number(d?.commission_pct ?? d?.commission ?? 0),
    is_active: Boolean(d?.is_active ?? d?.active ?? false),
    influencer_id: d?.influencer_id !== undefined ? Number(d.influencer_id) : undefined,
    created_at: d?.created_at,
    updated_at: d?.updated_at,
  };
}

export default function CodeDetailPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const codeId = params?.id;

  const [data, setData] = useState<CodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form alanları
  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState<number | ''>('');
  const [commissionPct, setCommissionPct] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  async function fetchDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(codeId)}`, {
        method: 'GET',
        credentials: 'include',
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Kod detayları alınamadı.');
        setLoading(false);
        return;
      }
      let json: any = {};
      try {
        json = JSON.parse(text || '{}');
      } catch {}
      const detail = normalizeDetail(json?.code || json);
      setData(detail);

      setCode(detail.code || '');
      const currentDiscount = detail.discount_percentage ?? detail.discount_pct;
      setDiscountPct(
        typeof currentDiscount === 'number' && !Number.isNaN(currentDiscount)
          ? currentDiscount
          : ''
      );
      setCommissionPct(
        typeof detail.commission_pct === 'number' && !Number.isNaN(detail.commission_pct)
          ? detail.commission_pct
          : ''
      );
      setIsActive(Boolean(detail.is_active));
    } catch (e) {
      setError('Beklenmeyen bir hata oluştu (detay).');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (codeId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeId]);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Basit doğrulamalar
    if (discountPct !== '' && (Number(discountPct) < 1 || Number(discountPct) > 100)) {
      setError('İndirim yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    if (commissionPct !== '' && (Number(commissionPct) < 1 || Number(commissionPct) > 100)) {
      setError('Komisyon yüzdesi 1-100 arasında olmalıdır.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(codeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: code || undefined,
          discount_percentage: discountPct === '' ? undefined : Number(discountPct),
          commission_pct: commissionPct === '' ? undefined : Number(commissionPct),
          is_active: isActive,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Kod güncelleme başarısız.');
        return;
      }
      // Başarılıysa yeniden yükle
      await fetchDetail();
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu (güncelleme).');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm('Bu kodu silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/codes/${encodeURIComponent(codeId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Kod silme başarısız.');
        setDeleting(false);
        return;
      }
      // Başarılı silme → listeye dön
      router.push('/codes');
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu (silme).');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-gray-600">Yükleniyor…</div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="p-6 space-y-4">
        <div className="text-red-600">{error}</div>
        <a href="/codes" className="text-blue-600 hover:text-blue-800 text-sm">Listeye dön</a>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-6 space-y-4">
        <div className="text-gray-600">Kayıt bulunamadı</div>
        <a href="/codes" className="text-blue-600 hover:text-blue-800 text-sm">Listeye dön</a>
      </main>
    );
  }

  const effectiveDiscount = data.discount_percentage ?? data.discount_pct;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kod Detayı #{data.id}</h1>
        <div className="flex items-center gap-3">
          <a href="/codes" className="text-blue-600 hover:text-blue-800 text-sm">Listeye Dön</a>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 text-white px-4 py-2 hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      </div>

      <form onSubmit={onSave} className="space-y-4 max-w-xl bg-white rounded-md border p-6">
        <div>
          <label className="block text-sm mb-1" htmlFor="code">Kod</label>
          <input
            id="code"
            name="code"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Örn: AHMET15"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="discount_pct">İndirim %</label>
            <input
              id="discount_pct"
              name="discount_pct"
              type="number"
              min={1}
              max={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={effectiveDiscount !== undefined ? String(effectiveDiscount) : '—'}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="commission_pct">Komisyon %</label>
            <input
              id="commission_pct"
              name="commission_pct"
              type="number"
              min={1}
              max={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={String(data.commission_pct ?? '')}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            className="h-4 w-4"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="is_active" className="text-sm">Aktif</label>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        <div>Oluşturma: {data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</div>
        <div>Güncelleme: {data.updated_at ? new Date(data.updated_at).toLocaleString() : '—'}</div>
        <div>Influencer ID: {data.influencer_id ?? '—'}</div>
      </div>
    </main>
  );
}