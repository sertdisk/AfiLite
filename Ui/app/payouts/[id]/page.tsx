'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type PayoutDetail = {
  id: number | string;
  influencer_id: number;
  amount: number;
  currency?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  reference?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  history?: Array<{
    id?: number | string;
    action?: string; // created, approved, paid, rejected
    by?: string;     // admin email/user
    message?: string;
    created_at?: string;
  }>;
  meta?: any;
};

export default function PayoutDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<PayoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDetail(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payouts/${encodeURIComponent(id)}`, {
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
        setError(msg || 'Ödeme detayı alınamadı.');
        setRow(null);
        return;
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }
      const detail: PayoutDetail = (json?.payout ?? json) as PayoutDetail;
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
        <h1 className="text-2xl font-semibold">Ödeme Detayı #{id}</h1>
        <a
          href="/payouts"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Listeye Dön
        </a>
      </div>

      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && row && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Özet Bilgiler */}
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Özet</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Influencer ID</div>
                  <div className="col-span-2">{row.influencer_id}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Tutar</div>
                  <div className="col-span-2">
                    {Number(row.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {row.currency ? ` ${row.currency}` : ''}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Durum</div>
                  <div className="col-span-2 capitalize">{row.status}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Ref</div>
                  <div className="col-span-2">{row.reference || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Oluşturulma</div>
                  <div className="col-span-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Güncellenme</div>
                  <div className="col-span-2">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Notlar</div>
              <div className="p-4 text-sm whitespace-pre-wrap">{row.notes || '—'}</div>
            </div>

            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">İşlem Geçmişi</div>
              <div className="p-4">
                {row.history && row.history.length > 0 ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Aksiyon</th>
                        <th className="px-3 py-2">Kullanıcı</th>
                        <th className="px-3 py-2">Mesaj</th>
                        <th className="px-3 py-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.history.map((h, idx) => (
                        <tr key={String(h.id ?? idx)} className="border-t">
                          <td className="px-3 py-2">{h.id ?? idx}</td>
                          <td className="px-3 py-2 capitalize">{h.action || '—'}</td>
                          <td className="px-3 py-2">{h.by || '—'}</td>
                          <td className="px-3 py-2">{h.message || '—'}</td>
                          <td className="px-3 py-2">{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-600">İşlem geçmişi yok.</div>
                )}
              </div>
            </div>
          </section>

          {/* Sağ: Yönetim ve ham meta */}
          <aside className="space-y-4">
            <div className="rounded-md border bg-white p-4">
              <div className="text-sm text-gray-600 mb-3">
                Yönetim işlemleri (gelecek): Onayla / Reddet / Ödendi işaretle.
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  className="rounded-md bg-green-600 text-white px-4 py-2 text-sm opacity-60 cursor-not-allowed"
                  title="Gelecekte aktif edilecek"
                >
                  Onayla
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-md bg-red-600 text-white px-4 py-2 text-sm opacity-60 cursor-not-allowed"
                  title="Gelecekte aktif edilecek"
                >
                  Reddet
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm opacity-60 cursor-not-allowed"
                  title="Gelecekte aktif edilecek"
                >
                  Ödendi İşaretle
                </button>
              </div>
            </div>

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