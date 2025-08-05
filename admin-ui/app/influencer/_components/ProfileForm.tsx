/* Açıklama (TR):
 * Influencer profil formu — mevcut değerleri doldurur ve güncelleme yapar.
 * - Güncellenebilir alanlar: name, social_handle, niche, channels (virgülle), country, bio, website.
 * - patchInfluencerMe ile güncelleme yapar; başarıda non-intrusive toast benzeri mesaj gösterir.
 * - Erişilebilirlik: label-for/id eşleşmesi, role="alert", aria-busy.
 * - Glassmorphism ve minimal mikro etkileşimler uygulanır.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Influencer, patchInfluencerMe } from '@/lib/api';

type FormState = {
  name: string;
  social_handle: string;
  niche: string;
  channels: string;
  country: string;
  bio: string;
  website: string;
};

export default function ProfileForm({ initial }: { initial: Influencer }) {
  const [form, setForm] = useState<FormState>({
    name: initial.name ?? '',
    social_handle: initial.social_handle ?? '',
    niche: initial.niche ?? '',
    channels: (initial.channels ?? []).join(', '),
    country: initial.country ?? '',
    bio: initial.bio ?? '',
    website: initial.website ?? ''
  });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requiredFields: (keyof FormState)[] = ['name', 'social_handle', 'niche', 'channels', 'country'];

  const isValid = useMemo(() => {
    if (!requiredFields.every((k) => String(form[k] ?? '').trim().length > 0)) return false;
    return true;
  }, [form]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);
    if (!isValid) return;
    setSaving(true);
    try {
      const updated = await patchInfluencerMe({
        name: form.name.trim(),
        social_handle: form.social_handle.trim(),
        niche: form.niche.trim(),
        channels: form.channels.split(',').map((s) => s.trim()).filter(Boolean),
        country: form.country.trim(),
        bio: form.bio.trim() || null,
        website: form.website.trim() || null
      });
      // Formu güncel değerle eşitle
      setForm({
        name: updated.name ?? '',
        social_handle: updated.social_handle ?? '',
        niche: updated.niche ?? '',
        channels: (updated.channels ?? []).join(', '),
        country: updated.country ?? '',
        bio: updated.bio ?? '',
        website: updated.website ?? ''
      });
      setSuccess('Profil başarıyla güncellendi.');
    } catch (err: any) {
      setServerError(err?.message || 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Sunucu hatası */}
      {serverError && (
        <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded p-2">
          {serverError}
        </div>
      )}
      {/* Başarı bildirimi */}
      {success && (
        <div role="status" className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 rounded p-2">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm mb-1">İsim</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Ad Soyad"
          />
        </div>

        <div>
          <label htmlFor="social_handle" className="block text-sm mb-1">Sosyal Hesap</label>
          <input
            id="social_handle"
            value={form.social_handle}
            onChange={(e) => handleChange('social_handle', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="@kullanici"
          />
        </div>

        <div>
          <label htmlFor="niche" className="block text-sm mb-1">Niş</label>
          <input
            id="niche"
            value={form.niche}
            onChange={(e) => handleChange('niche', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Teknoloji, Moda, Oyun..."
          />
        </div>

        <div>
          <label htmlFor="channels" className="block text-sm mb-1">Kanallar (virgülle)</label>
          <input
            id="channels"
            value={form.channels}
            onChange={(e) => handleChange('channels', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="YouTube, Instagram, TikTok"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm mb-1">Ülke</label>
          <input
            id="country"
            value={form.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Türkiye"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="block text-sm mb-1">Biyografi</label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={4}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Kendinizden kısaca bahsedin (opsiyonel)"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="website" className="block text-sm mb-1">Web Sitesi (opsiyonel)</label>
          <input
            id="website"
            value={form.website}
            onChange={(e) => handleChange('website', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          aria-busy={saving}
          disabled={!isValid || saving}
          className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}