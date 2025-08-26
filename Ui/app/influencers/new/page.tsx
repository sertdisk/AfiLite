'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function NewInfluencerPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [channels, setChannels] = useState(''); // comma-separated, will be split to string[]
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('pending');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function parseChannels(input: string): string[] | undefined {
    const parts = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : undefined;
  }

  function validate(): string | null {
    if (!name || name.trim().length < 2) return 'İsim en az 2 karakter olmalıdır.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Geçerli bir email adresi giriniz.';
    if (!socialHandle || socialHandle.trim().length < 2) return 'Sosyal hesap bilgisi gerekli.';
    // website optional, simple URL sanity if provided
    if (website) {
      try {
        // eslint-disable-next-line no-new
        new URL(website);
      } catch {
        return 'Geçerli bir website adresi giriniz.';
      }
    }
    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return 'Geçersiz status.';
    }
    // Terms optional but if explicit false, still allow? PRD’ye göre UI’da checkbox var, zorunlu kabul gerekli ise buradan kontrol edin.
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        social_handle: socialHandle.trim(),
        niche: niche || undefined,
        channels: parseChannels(channels),
        country: country || undefined,
        bio: bio || undefined,
        website: website || undefined,
        status,
        terms_accepted: termsAccepted === true,
      };

      const res = await fetch('/api/influencers', {
        method: 'POST',
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
        setError(msg || 'Influencer oluşturma başarısız.');
        return;
      }

      setSuccessMsg('Influencer oluşturuldu.');
      // Listeye yönlendir
      setTimeout(() => router.push('/influencers'), 600);
    } catch (e) {
      setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Yeni Influencer</h1>
        <a
          href="/influencers"
          className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black"
        >
          Listeye Dön
        </a>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 max-w-3xl bg-white rounded-md border p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1">İsim</label>
            <input
              id="name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
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
              placeholder="ahmet@example.com"
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
              placeholder="@ahmetyilmaz / instagram.com/…"
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
              placeholder="Moda, lifestyle, teknoloji…"
            />
          </div>
          <div>
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
              placeholder="TR"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className="block text-sm mb-1">Bio</label>
            <textarea
              id="bio"
              className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kısa bir tanıtım…"
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
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="terms" className="text-sm">Şartları kabul ediyorum</label>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {successMsg && <div className="text-sm text-green-600">{successMsg}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
          <a
            href="/influencers"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Vazgeç
          </a>
        </div>
      </form>
    </main>
  );
}