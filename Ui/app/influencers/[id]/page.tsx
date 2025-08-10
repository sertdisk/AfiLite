'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/* Balance tipleri dosyada tekil tanımlı olmalı — yinelenen tanımları kaldırıyoruz */
type BalanceSummary = {
  total_earnings?: number;
  pending_earnings?: number;
  paid_earnings?: number;
  currency?: string;
};

type BalanceMovement = {
  id: number | string;
  type: string;
  amount: number;
  description?: string;
  created_at?: string;
};

/* Balance tipleri tekil olmalı */
/* yinelenen BalanceSummary/BalanceMovement kaldırıldı */

type Influencer = {
  id: number;
  name: string;
  email: string;
  social_handle?: string;
  niche?: string;
  channels?: string[] | string | null;
  country?: string;
  bio?: string | null;
  website?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at?: string;
  updated_at?: string;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

function toArray(val: any): string[] | undefined {
  if (val == null) return undefined;
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try {
      const maybe = JSON.parse(val);
      if (Array.isArray(maybe)) return maybe as string[];
    } catch {
      // fallthrough
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.length ? parts : undefined;
    }
  }
  return undefined;
}

function channelsToText(val: any): string {
  const arr = toArray(val);
  return (arr || []).join(', ');
}

export default function InfluencerDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profil form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [channels, setChannels] = useState(''); // UI'de virgül ile ayrılmış
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>('pending');

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
        setError(msg || 'Influencer bilgileri alınamadı.');
        return;
      }
      let json: any = {};
      try { json = JSON.parse(text || '{}'); } catch { json = {}; }

      // API ya { influencer: {...} } ya da direkt obje dönebilir
      const row: Influencer = (json?.influencer ?? json) as Influencer;

      setName(row.name || '');
      setEmail(row.email || '');
      setSocialHandle(row.social_handle || '');
      setNiche(row.niche || '');
      setChannels(channelsToText(row.channels));
      setCountry(row.country || '');
      setBio((row.bio ?? '') || '');
      setWebsite((row.website ?? '') || '');
      setStatus((row.status as any) || 'pending');
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setError('Beklenmeyen bir hata oluştu.');
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

  function parseChannels(input: string): string[] | undefined {
    const parts = (input || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length ? parts : undefined;
  }

  function validate(): string | null {
    if (!name || name.trim().length < 2) return 'İsim en az 2 karakter olmalıdır.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Geçerli bir email adresi giriniz.';
    if (!socialHandle || socialHandle.trim().length < 2) return 'Sosyal hesap bilgisi gerekli.';
    if (website) {
      try { new URL(website); } catch { return 'Geçerli bir website adresi giriniz.'; }
    }
    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) return 'Geçersiz status.';
    return null;
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        email: email.trim(),
        social_handle: socialHandle.trim(),
        niche: niche || undefined,
        channels: parseChannels(channels),
        country: country || undefined,
        bio: bio || undefined,
        website: website || undefined,
        status,
      };

      const res = await fetch(`/api/influencers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Güncelleme başarısız.');
        return;
      }

      setSuccessMsg('Profil güncellendi.');
      // Güncel veriyi tekrar çek
      await fetchDetail();
    } catch (e) {
      setError('Beklenmeyen bir hata oluştu (güncelleme).');
    } finally {
      setSaving(false);
    }
  }

  // Sekme durumu: Profil, Kodlar, Bakiye
  const [tab, setTab] = useState<'profile' | 'codes' | 'balance'>('profile');

  const tabs = useMemo(() => ([
    { key: 'profile', label: 'Profil' },
    { key: 'codes', label: 'Kodlar' },
    { key: 'balance', label: 'Bakiye' },
  ] as const), []);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Influencer #{id}</h1>
        <a
          href="/influencers"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Listeye Dön
        </a>
      </div>

      <div className="border-b flex items-center gap-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && tab === 'profile' && (
        <form onSubmit={onSave} className="space-y-5 max-w-3xl bg-white rounded-md border p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm mb-1">İsim</label>
              <input
                id="name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm mb-1">Email</label>
              <input
                id="email"
                type="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="social_handle" className="block text-sm mb-1">Sosyal Hesap</label>
              <input
                id="social_handle"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="niche" className="block text-sm mb-1">Niche</label>
              <input
                id="niche"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="channels" className="block text-sm mb-1">Kanallar (virgülle ayır)</label>
              <input
                id="channels"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={channels}
                onChange={(e) => setChannels(e.target.value)}
                placeholder="instagram, tiktok, youtube"
              />
              <p className="text-xs text-gray-500 mt-1">Örn: instagram, tiktok (gönderimde ['instagram', 'tiktok'] olarak çevrilir)</p>
            </div>
            <div>
              <label htmlFor="country" className="block text-sm mb-1">Ülke</label>
              <input
                id="country"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bio" className="block text-sm mb-1">Bio</label>
              <textarea
                id="bio"
                className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website" className="block text-sm mb-1">Website</label>
              <input
                id="website"
                type="url"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm mb-1">Durum</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {successMsg && <div className="text-sm text-green-600">{successMsg}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <a href="/influencers" className="text-sm text-blue-600 hover:text-blue-800">Vazgeç</a>
          </div>
        </form>
      )}

      {!loading && !error && tab === 'codes' && (
        <section className="space-y-3">
          <div className="text-sm text-gray-600">
            Kodlar (stub): Bu sekmede ilgili influencer'a ait kodlar listelenecektir.
          </div>
          <a
            href="/codes/new"
            className="inline-flex items-center rounded-md bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"
          >
            Yeni Kod Oluştur
          </a>
        </section>
      )}

      {!loading && !error && tab === 'balance' && (
        <BalanceSection influencerId={id as string} />
      )}
    </main>
  );
}

function BalanceSection({ influencerId }: { influencerId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [history, setHistory] = useState<BalanceMovement[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll(ctrl?: AbortController) {
    setLoading(true);
    setError(null);
    try {
      const [sRes, hRes] = await Promise.all([
        fetch(`/api/balance/${encodeURIComponent(influencerId)}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: ctrl?.signal,
        }),
        fetch(`/api/balance/${encodeURIComponent(influencerId)}/history`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: ctrl?.signal,
        }),
      ]);

      const sText = await sRes.text();
      const hText = await hRes.text();

      if (!sRes.ok) {
        let msg = sText;
        try { const maybe = JSON.parse(sText || '{}'); msg = maybe?.message || maybe?.error || msg; } catch {}
        setError(msg || 'Bakiye özeti alınamadı.');
        setSummary(null);
        setHistory([]);
        return;
      }
      if (!hRes.ok) {
        let msg = hText;
        try { const maybe = JSON.parse(hText || '{}'); msg = maybe?.message || maybe?.error || msg; } catch {}
        setError(msg || 'Bakiye hareketleri alınamadı.');
        setSummary(null);
        setHistory([]);
        return;
      }

      let sJson: any = {};
      let hJson: any = {};
      try { sJson = JSON.parse(sText || '{}'); } catch { sJson = {}; }
      try { hJson = JSON.parse(hText || '{}'); } catch { hJson = {}; }

      const s: BalanceSummary = (sJson?.balance ?? sJson) as BalanceSummary;
      const movements: BalanceMovement[] = Array.isArray(hJson?.history) ? hJson.history : (Array.isArray(hJson) ? hJson : []);

      setSummary(s || null);
      setHistory(movements || []);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setError('Beklenmeyen bir hata oluştu.');
        setSummary(null);
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAll(ctrl);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [influencerId]);

  return (
    <section className="space-y-4">
      {loading && <div className="text-gray-600">Yükleniyor…</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {!loading && !error && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-md border p-4 bg-white">
            <div className="text-xs text-gray-500">Toplam Kazanç</div>
            <div className="text-lg font-semibold">
              {Number(summary.total_earnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {summary.currency ? ` ${summary.currency}` : ''}
            </div>
          </div>
          <div className="rounded-md border p-4 bg-white">
            <div className="text-xs text-gray-500">Bekleyen</div>
            <div className="text-lg font-semibold">
              {Number(summary.pending_earnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {summary.currency ? ` ${summary.currency}` : ''}
            </div>
          </div>
          <div className="rounded-md border p-4 bg-white">
            <div className="text-xs text-gray-500">Ödenen</div>
            <div className="text-lg font-semibold">
              {Number(summary.paid_earnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {summary.currency ? ` ${summary.currency}` : ''}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-md border bg-white">
          <div className="border-b px-4 py-3 font-medium">Hareketler</div>
          <div className="p-4">
            {history.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Tür</th>
                    <th className="px-3 py-2">Tutar</th>
                    <th className="px-3 py-2">Açıklama</th>
                    <th className="px-3 py-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((m) => (
                    <tr key={String(m.id)} className="border-t">
                      <td className="px-3 py-2">{m.id}</td>
                      <td className="px-3 py-2 capitalize">{m.type}</td>
                      <td className="px-3 py-2">
                        {Number(m.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {summary?.currency ? ` ${summary.currency}` : ''}
                      </td>
                      <td className="px-3 py-2">{m.description || '—'}</td>
                      <td className="px-3 py-2">{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-gray-600">Hareket bulunamadı.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}