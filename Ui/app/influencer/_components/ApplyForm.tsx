/* Açıklama (TR):
 * Influencer başvuru formu — revizyon:
 * - “Kanallar” (channels) alanı kaldırıldı.
 * - Yerine dinamik “Sosyal medya hesaplarınız” (social_accounts) alt formu eklendi.
 * - Her hesap: platform (Instagram | YouTube | TikTok | Other), platformName (Other ise zorunlu),
 *   handleOrChannel, followers (>=0), avgViews (>=0).
 * - En az bir hesap zorunlu. Hatalar role="alert" ile gösterilir.
 * - Geçici olarak payload içine social_accounts aynen eklenir (backend görmezden gelebilir).
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postInfluencerApply } from '@/lib/api';

type Platform = 'Instagram' | 'YouTube' | 'TikTok' | 'Web' | 'Other';

type SocialAccount = {
  platform: Platform;
  platformName?: string;
  handleOrChannel: string;
  address?: string; // Yeni eklendi (web adresi)
  role?: string; // Yeni eklendi
  niche?: string; // Yeni eklendi
  followers: number | '';
  avgViews: number | '';
};

type FormState = {
  // Hesap Alanı
  email: string;
  password: string; // Yeni eklendi
  brandName: string; // Yeni eklendi

  // İletişim Alanı
  name: string;
  phone: string;
  countryCode: string; // Yeni eklendi
  isWhatsappActive: boolean; // Yeni eklendi
  alternativePhone: string; // Yeni eklendi
  bio: string;

  // Aktif Olunan Platformlar Alanı
  social_accounts: SocialAccount[];
  platformMessage: string; // Yeni eklendi

  // Ödeme ve İşletme Bilgileri Alanı
  iban: string; // Yeni eklendi
  bankName: string; // Yeni eklendi
  accountHolder: string; // Yeni eklendi
  businessType: 'individual' | 'company' | ''; // Yeni eklendi
  commercialTitle: string; // Yeni eklendi
  taxOffice: string; // Yeni eklendi
  taxNumber: string; // Yeni eklendi
  businessAddress: string; // Yeni eklendi

  // Genel Mesaj Inputu
  generalMessage: string; // Yeni eklendi

  // Sözleşme Alanı
  terms_accepted: boolean;
};

function isValidEmail(v: string) {
  // Minimal kontrol
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    // Hesap Alanı
    email: '',
    password: '',
    brandName: '',

    // İletişim Alanı
    name: '',
    phone: '',
    countryCode: '+90', // Varsayılan ülke kodu
    isWhatsappActive: false,
    alternativePhone: '',
    bio: '',

    // Aktif Olunan Platformlar Alanı
    social_accounts: [{ platform: 'Instagram', handleOrChannel: '', followers: '', avgViews: '', role: '', niche: '' }],
    platformMessage: '',

    // Ödeme ve İşletme Bilgileri Alanı
    iban: '',
    bankName: '',
    accountHolder: '',
    businessType: '',
    commercialTitle: '',
    taxOffice: '',
    taxNumber: '',
    businessAddress: '',

    // Genel Mesaj Inputu
    generalMessage: '',

    // Sözleşme Alanı
    terms_accepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const requiredFields: (keyof FormState)[] = [
    'email', 'password', 'brandName', 'name', 'phone', 'countryCode', 'iban', 'bankName', 'accountHolder',
    'businessType', 'commercialTitle', 'taxOffice', 'taxNumber', 'businessAddress'
  ];

  const isValid = useMemo(() => {
    if (!requiredFields.every((k) => String((form as any)[k] ?? '').trim().length > 0)) return false;
    if (!isValidEmail(form.email)) return false;
    if (!form.terms_accepted) return false;
    if (!form.social_accounts || form.social_accounts.length < 1) return false;
    for (const acc of form.social_accounts) {
      if (!acc.platform) return false;
      if ((acc.platform === 'Other' || acc.platform === 'Web') && !(acc.platformName && acc.platformName.trim().length >= 2)) return false;
      if (!(acc.handleOrChannel && acc.handleOrChannel.trim().length >= 2)) return false;
      // role ve niche zorunlu değil, bu yüzden kontrol etmiyoruz
      const f = typeof acc.followers === 'number' ? acc.followers : Number(acc.followers);
      const v = typeof acc.avgViews === 'number' ? acc.avgViews : Number(acc.avgViews);
      if (!Number.isFinite(f) || f < 0) return false;
      if (!Number.isFinite(v) || v < 0) return false;
    }
    return true;
  }, [form]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function setSocialAccount(index: number, patch: Partial<SocialAccount>) {
    setForm((prev) => {
      const next = [...prev.social_accounts];
      next[index] = { ...next[index], ...patch };
      if (patch.platform && patch.platform !== 'Other' && patch.platform !== 'Web') next[index].platformName = undefined;
      return { ...prev, social_accounts: next };
    });
  }
  function addAccount() {
    setForm((prev) => ({
      ...prev,
      social_accounts: [
        ...prev.social_accounts,
        { platform: 'Instagram', handleOrChannel: '', address: '', followers: '', avgViews: '', role: '', niche: '' }
      ]
    }));
  }
  function removeAccount(index: number) {
    setForm((prev) => {
      const next = prev.social_accounts.slice();
      if (next.length <= 1) {
        next[0] = { platform: 'Instagram', handleOrChannel: '', followers: '', avgViews: '' };
        return { ...prev, social_accounts: next };
      }
      next.splice(index, 1);
      return { ...prev, social_accounts: next };
    });
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    requiredFields.forEach((k) => {
      if (k === 'alternativePhone' || k === 'bio' || k === 'platformMessage' || k === 'generalMessage' || k === 'isWhatsappActive') {
        // Bu alanlar zorunlu değil, atla
        return;
      }
      if (!String((form as any)[k] ?? '').trim()) {
        nextErrors[String(k)] = 'Bu alan zorunludur.';
      }
    });

    if (form.email && !isValidEmail(form.email)) {
      nextErrors.email = 'Geçerli bir e-posta girin.';
    }
    if (form.password && form.password.length < 6) { // Basit şifre kontrolü
      nextErrors.password = 'Şifre en az 6 karakter olmalı.';
    }

    const phoneDigits = form.phone.replace(/[\s.\-]/g, '');
    if (form.phone && !/^\d{7,15}$/.test(phoneDigits)) { // Ülke kodu olmadan sadece numara kontrolü
      nextErrors.phone = 'Geçerli bir telefon numarası girin.';
    }
    const altPhoneDigits = form.alternativePhone.replace(/[\s.\-]/g, '');
    if (form.alternativePhone && !/^\d{7,15}$/.test(altPhoneDigits)) {
      nextErrors.alternativePhone = 'Geçerli bir alternatif telefon numarası girin.';
    }

    if (!form.social_accounts || form.social_accounts.length < 1) {
      nextErrors['social_accounts'] = 'En az bir sosyal hesap ekleyin.';
    } else {
      form.social_accounts.forEach((acc, idx) => {
        if (!acc.platform) nextErrors[`social_accounts.${idx}.platform`] = 'Platform seçin.';
        if (acc.platform === 'Other' && !(acc.platformName && acc.platformName.trim().length >= 2)) {
          nextErrors[`social_accounts.${idx}.platformName`] = 'Platform adı en az 2 karakter olmalı.';
        }
        if (!(acc.handleOrChannel && acc.handleOrChannel.trim().length >= 2)) {
          nextErrors[`social_accounts.${idx}.handleOrChannel`] = 'En az 2 karakter girin.';
        }
        // address opsiyonel: sadece Web platformu seçildiyse ve girilmişse basit kontrol yap
        if (acc.platform === 'Web' && acc.address && acc.address.trim().length > 0) {
          try {
            // URL kaba kontrol
            const u = new URL(acc.address.startsWith('http') ? acc.address : `https://${acc.address}`);
            if (!u.hostname) {
              nextErrors[`social_accounts.${idx}.address`] = 'Geçerli bir web adresi girin.';
            }
          } catch {
            nextErrors[`social_accounts.${idx}.address`] = 'Geçerli bir web adresi girin.';
          }
        }
        const f = typeof acc.followers === 'number' ? acc.followers : Number(acc.followers);
        const v = typeof acc.avgViews === 'number' ? acc.avgViews : Number(acc.avgViews);
        if (!Number.isFinite(f) || f < 0) {
          nextErrors[`social_accounts.${idx}.followers`] = '0 veya daha büyük bir sayı girin.';
        }
        if (!Number.isFinite(v) || v < 0) {
          nextErrors[`social_accounts.${idx}.avgViews`] = '0 veya daha büyük bir sayı girin.';
        }
      });
    }

    if (!form.terms_accepted) {
      nextErrors.terms_accepted = 'Şartları kabul etmelisiniz.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const social_accounts = form.social_accounts.map((acc) => ({
        platform: acc.platform,
        platformName: (acc.platform === 'Other' || acc.platform === 'Web') ? acc.platformName?.trim() : undefined,
        handleOrChannel: acc.handleOrChannel.trim(),
        address: acc.address?.trim() || undefined,
        role: acc.role?.trim() || undefined,
        niche: acc.niche?.trim() || undefined,
        followers: Number(acc.followers),
        avgViews: Number(acc.avgViews)
      }));
      const payload: any = {
        email: form.email.trim(),
        password: form.password.trim(),
        brandName: form.brandName.trim(),
        name: form.name.trim(),
        phone: `${form.countryCode}${form.phone.replace(/[\s.\-]/g, '')}`,
        isWhatsappActive: form.isWhatsappActive,
        alternativePhone: form.alternativePhone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        social_accounts,
        platformMessage: form.platformMessage.trim() || undefined,
        iban: form.iban.trim(),
        bankName: form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        businessType: form.businessType,
        commercialTitle: form.commercialTitle.trim(),
        taxOffice: form.taxOffice.trim(),
        taxNumber: form.taxNumber.trim(),
        businessAddress: form.businessAddress.trim(),
        generalMessage: form.generalMessage.trim() || undefined,
        terms_accepted: form.terms_accepted,
      };
      await postInfluencerApply(payload as any);
      router.push('/influencer/status');
    } catch (err: any) {
      setServerError(err?.message || 'Gönderim başarısız.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-app max-w-3xl mx-auto w-full">
      {/* Sunucu hatası */}
      {serverError && (
        <div role="alert" className="text-sm text-app bg-red-900/30 border border-app rounded p-2">
          {serverError}
        </div>
      )}

      {/* Hesap Alanı */}
      <div className="space-y-4 p-4 border border-app rounded-md">
        <h2 className="text-lg font-semibold text-app">Hesap Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1 text-muted">E-posta</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="ornek@mail.com"
            />
            {errors['email'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['email']}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1 text-muted">Şifre</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Şifrenizi girin"
            />
            {errors['password'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['password']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="brandName" className="block text-sm mb-1 text-muted">Markanız</label>
            <input
              id="brandName"
              value={form.brandName}
              onChange={(e) => setField('brandName', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Sosyal medyadaki marka adınız"
            />
            {errors['brandName'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['brandName']}</p>}
          </div>
        </div>
      </div>

      {/* İletişim Alanı */}
      <div className="space-y-4 p-4 border border-app rounded-md">
        <h2 className="text-lg font-semibold text-app">İletişim Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1 text-muted">İsim Soyisim</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Ad Soyad"
            />
            {errors['name'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['name']}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm mb-1 text-muted">Telefon Numarası</label>
            <div className="flex">
              <select
                value={form.countryCode}
                onChange={(e) => setField('countryCode', e.target.value)}
                className="rounded-l-md border border-r-0 border-app bg-panel px-1 text-app focus-ring transition w-16 h-10"
              >
                <option value="+90">TR +90</option>
                <option value="+1">US +1</option>
                <option value="+44">UK +44</option>
                <option value="+49">DE +49</option>
                <option value="+33">FR +33</option>
                <option value="+34">ES +34</option>
                <option value="+39">IT +39</option>
              </select>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  const cleaned = value.replace(/[^\d\s]/g, '');
                  setField('phone', cleaned);
                }}
                className="flex-1 min-w-0 rounded-r-md border border-app bg-panel px-3 h-10 text-app placeholder:text-muted focus-ring transition"
                placeholder="5xx xxx xx xx"
              />
            </div>
            {errors['phone'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['phone']}</p>}
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="isWhatsappActive"
              type="checkbox"
              checked={form.isWhatsappActive}
              onChange={(e) => setField('isWhatsappActive', e.target.checked)}
              className="h-4 w-4 rounded border-app bg-panel text-app focus-ring transition"
            />
            <label htmlFor="isWhatsappActive" className="text-sm text-muted">WhatsApp aktif</label>
          </div>
          <div>
            <label htmlFor="alternativePhone" className="block text-sm mb-1 text-muted">Alternatif Telefon Numarası (WhatsApp)</label>
            <input
              id="alternativePhone"
              type="tel"
              value={form.alternativePhone}
              onChange={(e) => {
                const value = e.target.value;
                const cleaned = value.replace(/[^\d\s]/g, '');
                setField('alternativePhone', cleaned);
              }}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="5xx xxx xx xx (Opsiyonel)"
            />
            {errors['alternativePhone'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['alternativePhone']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className="block text-sm mb-1 text-muted">Biyografi (Hakkınızda açıklama yapmak isterseniz bilmek isteriz)</label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Kendinizden kısaca bahsedin (opsiyonel)"
            />
          </div>
        </div>
      </div>

      {/* Aktif Olunan Platformlar Alanı */}
      <div className="space-y-4 p-4 border border-app rounded-md">
        <h2 className="text-lg font-semibold text-app">Aktif Olunan Platformlar</h2>
        <div className="mb-2">
          <p className="text-sm text-muted">Sosyal medya hesaplarınız</p>
          <p className="text-xs text-muted">Birden fazla hesap ekleyebilirsiniz. Platform, hesap/kanal adı ve metrikleri girin.</p>
        </div>

        <div className="rounded-md border border-app bg-panel">
          {form.social_accounts.map((acc, idx) => {
            const isOther = acc.platform === 'Other';
            return (
              <div key={idx} className="p-3 sm:p-4 card-hover">
                {/* 2 satırlı sabit düzen: her satır 2 sütun */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* Platform */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Platform</label>
                    <select
                      value={acc.platform}
                      onChange={(e) => setSocialAccount(idx, { platform: e.target.value as any })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Web">Web</option>
                      <option value="Other">Diğer</option>
                    </select>
                    {errors[`social_accounts.${idx}.platform`] && (
                      <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        {errors[`social_accounts.${idx}.platform`]}
                      </p>
                    )}
                  </div>

                  {/* Platform adı */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Platform adı</label>
                    <input
                      value={isOther ? (acc.platformName ?? '') : acc.platform}
                      onChange={(e) => {
                        if (isOther) {
                          setSocialAccount(idx, { platformName: e.target.value });
                        }
                      }}
                      readOnly={!isOther}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder={isOther ? "Örn. Twitch" : ""}
                    />
                    {errors[`social_accounts.${idx}.platformName`] && (
                      <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        {errors[`social_accounts.${idx}.platformName`]}
                      </p>
                    )}
                  </div>

                  {/* Handle/Kanal */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Hesap Adı</label>
                    <input
                      value={acc.handleOrChannel}
                      onChange={(e) => setSocialAccount(idx, { handleOrChannel: e.target.value })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="@kullanici | Kanal adı"
                    />
                    {errors[`social_accounts.${idx}.handleOrChannel`] && (
                      <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        {errors[`social_accounts.${idx}.handleOrChannel`]}
                      </p>
                    )}
                  </div>

                  {/* Adres (Web) */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Adres (Web)</label>
                    <input
                      value={(acc as any).address ?? ''}
                      onChange={(e) => setSocialAccount(idx, { address: e.target.value })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="https://... (varsa)"
                    />
                  </div>

                  {/* Görevi (Yeni Eklendi) */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Görevi</label>
                    <input
                      value={(acc as any).role ?? ''} // Yeni alan
                      onChange={(e) => setSocialAccount(idx, { role: e.target.value })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="Örn. İçerik Üreticisi"
                    />
                  </div>

                  {/* Niş (Yeni Eklendi) */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Niş</label>
                    <input
                      value={(acc as any).niche ?? ''} // Yeni alan
                      onChange={(e) => setSocialAccount(idx, { niche: e.target.value })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="Örn. Teknoloji"
                    />
                  </div>

                  {/* Takipçi */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">Takipçi Sayısı</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={acc.followers}
                      onChange={(e) => setSocialAccount(idx, { followers: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="0"
                      inputMode="numeric"
                    />
                    {errors[`social_accounts.${idx}.followers`] && (
                      <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        {errors[`social_accounts.${idx}.followers`]}
                      </p>
                    )}
                  </div>

                  {/* Ortalama İzlenme */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs mb-1 text-muted">1 Gönderi Ortalama Görüntüleme</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={acc.avgViews}
                      onChange={(e) => setSocialAccount(idx, { avgViews: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full h-10 rounded-md border border-app bg-panel px-2 text-app focus-ring transition"
                      placeholder="0"
                      inputMode="numeric"
                    />
                    {errors[`social_accounts.${idx}.avgViews`] && (
                      <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                        {errors[`social_accounts.${idx}.avgViews`]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Satır aksiyonları */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="h-px w-full border-t border-app opacity-60" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeAccount(idx)}
                      className="px-3 py-1 rounded-md border border-app bg-white/5 backdrop-blur text-sm text-app hover:bg-white/10 focus-ring transition"
                      title="Bu hesabı kaldır"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
                {idx < form.social_accounts.length - 1 && <div className="mt-3 h-px w-full border-t border-app opacity-40" />}
              </div>
            );
          })}
        </div>

        {/* Ekleme */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addAccount}
            className="px-3 py-1 rounded-md border border-app bg-white/5 backdrop-blur text-sm text-app hover:bg-white/10 focus-ring transition"
          >
            Platform Ekle
          </button>
        </div>

        {/* Genel sosyal hesap hatası */}
        {errors['social_accounts'] && (
          <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{errors['social_accounts']}</p>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="platformMessage" className="block text-sm mb-1 text-muted">Platformlardaki faaliyetleriniz hakkında bize iletmek istediklerinizi mesaj olarak belirtin</label>
          <textarea
            id="platformMessage"
            value={form.platformMessage}
            onChange={(e) => setField('platformMessage', e.target.value)}
            rows={4}
            className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
            placeholder="Mesajınızı buraya yazın (opsiyonel)"
          />
        </div>
      </div>

      {/* Ödeme ve İşletme Bilgileri Alanı */}
      <div className="space-y-4 p-4 border border-app rounded-md">
        <h2 className="text-lg font-semibold text-app">Ödeme ve İşletme Bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="iban" className="block text-sm mb-1 text-muted">Ödeme Yapılacak Hesap (IBAN)</label>
            <input
              id="iban"
              value={form.iban}
              onChange={(e) => setField('iban', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="TRXX XXXX XXXX XXXX XXXX XXXX XX"
            />
            {errors['iban'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['iban']}</p>}
          </div>
          <div>
            <label htmlFor="bankName" className="block text-sm mb-1 text-muted">Banka Adı</label>
            <input
              id="bankName"
              value={form.bankName}
              onChange={(e) => setField('bankName', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Banka Adı"
            />
            {errors['bankName'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['bankName']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="accountHolder" className="block text-sm mb-1 text-muted">Hesap Sahibi</label>
            <input
              id="accountHolder"
              value={form.accountHolder}
              onChange={(e) => setField('accountHolder', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Hesap Sahibi Adı Soyadı / Ünvanı"
            />
            {errors['accountHolder'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['accountHolder']}</p>}
          </div>
        </div>

        <h3 className="text-md font-semibold text-app mt-4">Fatura Bilgileri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="businessType" className="block text-sm mb-1 text-muted">İşletme Tipi</label>
            <select
              id="businessType"
              value={form.businessType}
              onChange={(e) => setField('businessType', e.target.value as 'individual' | 'company')}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app focus-ring transition"
            >
              <option value="">Seçiniz</option>
              <option value="individual">Şahıs</option>
              <option value="company">Firma</option>
            </select>
            {errors['businessType'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['businessType']}</p>}
          </div>
          <div>
            <label htmlFor="commercialTitle" className="block text-sm mb-1 text-muted">Ticari Ünvan</label>
            <input
              id="commercialTitle"
              value={form.commercialTitle}
              onChange={(e) => setField('commercialTitle', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Ticari Ünvan"
            />
            {errors['commercialTitle'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['commercialTitle']}</p>}
          </div>
          <div>
            <label htmlFor="taxOffice" className="block text-sm mb-1 text-muted">Vergi Dairesi</label>
            <input
              id="taxOffice"
              value={form.taxOffice}
              onChange={(e) => setField('taxOffice', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Vergi Dairesi"
            />
            {errors['taxOffice'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['taxOffice']}</p>}
          </div>
          <div>
            <label htmlFor="taxNumber" className="block text-sm mb-1 text-muted">Vergi Numarası</label>
            <input
              id="taxNumber"
              value={form.taxNumber}
              onChange={(e) => setField('taxNumber', e.target.value)}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="Vergi Numarası"
            />
            {errors['taxNumber'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['taxNumber']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="businessAddress" className="block text-sm mb-1 text-muted">İşletme Adresi</label>
            <textarea
              id="businessAddress"
              value={form.businessAddress}
              onChange={(e) => setField('businessAddress', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
              placeholder="İşletme Adresi"
            />
            {errors['businessAddress'] && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{errors['businessAddress']}</p>}
          </div>
        </div>
      </div>

      {/* Genel Mesaj Inputu */}
      <div className="space-y-4 p-4 border border-app rounded-md">
        <h2 className="text-lg font-semibold text-app">Ek Mesaj</h2>
        <div>
          <label htmlFor="generalMessage" className="block text-sm mb-1 text-muted">Formda olmayan bir şey mi demek istiyorsunuz? Mesaj yazın.</label>
          <textarea
            id="generalMessage"
            value={form.generalMessage}
            onChange={(e) => setField('generalMessage', e.target.value)}
            rows={4}
            className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
            placeholder="Mesajınızı buraya yazın (opsiyonel)"
          />
        </div>
      </div>

      {/* Sözleşme Alanı */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <input
            id="terms_accepted"
            type="checkbox"
            checked={form.terms_accepted}
            onChange={(e) => setField('terms_accepted', e.target.checked)}
            className="h-4 w-4 rounded border-app bg-panel text-app focus-ring transition"
          />
          <label htmlFor="terms_accepted" className="text-sm text-muted">
            <a href="/contract" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Sözleşme</a>’yi okudum, anladım ve kabul ettim.
          </label>
        </div>
        {errors['terms_accepted'] && (
          <p role="alert" className="-mt-2 text-xs" style={{ color: 'var(--danger)' }}>{errors['terms_accepted']}</p>
        )}

        <button
          type="submit"
          aria-busy={submitting}
          disabled={!isValid || submitting}
          className={`inline-flex items-center rounded-md px-4 py-2 focus-ring transition ${
            (!isValid || submitting)
              ? 'bg-gray-700 text-gray-300 cursor-not-allowed opacity-70'
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
        >
          {submitting ? 'Gönderiliyor…' : 'Kaydol'}
        </button>
      </div>
    </form>
  );
}