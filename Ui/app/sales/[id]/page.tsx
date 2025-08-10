'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type SaleDetail = {
  id: number;
  code: string;
  influencer_id: number;
  total_amount: number;
  commission?: number;
  currency?: string;
  created_at?: string;
  items?: Array<{
    sku?: string;
    name?: string;
    qty?: number;
    price?: number;
  }>;
  customer_email?: string;
  meta?: any;
};

export default function SaleDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<SaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDetail(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal: ctrl?.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Satış detayı alınamadı.');
        setRow(null);
        return;
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }
      const detail: SaleDetail = (json?.sale ?? json) as SaleDetail;
      setRow(detail || null);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setError('Beklenmeyen bir hata oluştu.');
        setRow(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    fetchDetail(ctrl);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Satış Detayı #{id}</h1>
        <a
          href="/sales"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Listeye Dön
        </a>
      </div>

      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && row && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Temel Bilgiler */}
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Özet</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Kod</div>
                  <div className="col-span-2">{row.code}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Influencer ID</div>
                  <div className="col-span-2">{row.influencer_id}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Toplam</div>
                  <div className="col-span-2">
                    {Number(row.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {row.currency ? ` ${row.currency}` : ''}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Komisyon</div>
                  <div className="col-span-2">
                    {row.commission != null ? Number(row.commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Tarih</div>
                  <div className="col-span-2">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Müşteri</div>
                  <div className="col-span-2">{row.customer_email || '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Kalemler</div>
              <div className="p-4">
                {row.items && row.items.length > 0 ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Ürün</th>
                        <th className="px-3 py-2">Adet</th>
                        <th className="px-3 py-2">Birim Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.items.map((it, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{it.sku || '—'}</td>
                          <td className="px-3 py-2">{it.name || '—'}</td>
                          <td className="px-3 py-2">{it.qty ?? '—'}</td>
                          <td className="px-3 py-2">
                            {it.price != null ? Number(it.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-600">Kalem bilgisi yok.</div>
                )}
              </div>
            </div>
          </section>

          {/* Sağ: Meta/JSON ham veriler */}
          <aside className="space-y-4">
            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Ham Veri (Meta)</div>
              <div className="p-4 text-xs">
                <pre className="whitespace-pre-wrap break-words">
{`${JSON.stringify(row, null, 2)}`}
                </pre>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}