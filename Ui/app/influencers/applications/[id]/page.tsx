'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Applicant = {
  id: number;
  name: string;
  email: string;
  social_handle?: string;
  niche?: string;
  channels?: string[] | string | null;
  country?: string;
  bio?: string | null;
  website?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

function toArray(val: any): string[] | undefined {
  if (val == null) return undefined;
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try {
      const maybe = JSON.parse(val);
      if (Array.isArray(maybe)) return maybe as string[];
    } catch {
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.length ? parts : undefined;
    }
  }
  return undefined;
}

export default function ApplicationReviewPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Applicant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<'approved' | 'rejected' | null>(null);

  async function fetchDetail(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/influencers/${encodeURIComponent(id)}`, {
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
        setError(msg || 'Başvuru bilgileri alınamadı.');
        setRow(null);
        return;
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }
      const record: Applicant = (json?.influencer ?? json) as Applicant;
      setRow(record);
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

  async function patchStatus(status: 'approved' | 'rejected') {
    const ok = window.confirm(`Bu başvuruyu "${status}" yapmak istediğinize emin misiniz?`);
    if (!ok) return;
    setProcessing(status);
    try {
      const res = await fetch(`/api/influencers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        alert(msg || 'İşlem başarısız.');
        return;
      }
      // Başarılı → başvurular listesine dön
      router.push('/influencers/applications');
    } catch {
      alert('Beklenmeyen bir hata oluştu.');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Başvuru İnceleme #{id}</h1>
        <a
          href="/influencers/applications"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Listeye Dön
        </a>
      </div>

      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && row && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Başvuru Bilgileri */}
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Temel Bilgiler</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Ad Soyad</div>
                  <div className="col-span-2">{row.name || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Email</div>
                  <div className="col-span-2">{row.email || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Sosyal Hesap</div>
                  <div className="col-span-2">{row.social_handle || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Niche</div>
                  <div className="col-span-2">{row.niche || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Kanallar</div>
                  <div className="col-span-2">
                    {(toArray(row.channels) || []).join(', ') || '—'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Ülke</div>
                  <div className="col-span-2">{row.country || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Website</div>
                  <div className="col-span-2">
                    {row.website ? <a className="text-blue-600 hover:text-blue-800" target="_blank" href={row.website}>{row.website}</a> : '—'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Durum</div>
                  <div className="col-span-2 capitalize">{row.status || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-gray-500">Oluşturulma</div>
                  <div className="col-span-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-white">
              <div className="border-b px-4 py-3 font-medium">Açıklama / Biyografi</div>
              <div className="p-4 text-sm whitespace-pre-wrap">{row.bio || '—'}</div>
            </div>
          </section>

          {/* Sağ: Aksiyonlar */}
          <aside className="space-y-4">
            <div className="rounded-md border bg-white p-4">
              <div className="text-sm text-gray-600 mb-3">
                Bu başvuru pending durumundaysa onaylayabilir veya reddedebilirsiniz.
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={processing === 'approved'}
                  onClick={() => patchStatus('approved')}
                  className="rounded-md bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700 disabled:opacity-60"
                >
                  {processing === 'approved' ? 'Onaylanıyor…' : 'Onayla'}
                </button>
                <button
                  type="button"
                  disabled={processing === 'rejected'}
                  onClick={() => patchStatus('rejected')}
                  className="rounded-md bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {processing === 'rejected' ? 'Reddediliyor…' : 'Reddet'}
                </button>
              </div>
            </div>

            <div className="rounded-md border bg-white p-4">
              <div className="text-sm text-gray-600">
                Onay sonrası, kullanıcı Influencer Detay sayfasında (profil/kod/bakiye sekmeleri) yönetilebilir.
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}