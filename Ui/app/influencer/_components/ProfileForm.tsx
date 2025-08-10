/* Açıklama (TR):
 * Influencer profil formu — mevcut değerleri doldurur ve güncelleme yapar.
 * - Güncellenebilir alanlar: name, social_handle, niche, channels (virgülle), country, bio, website.
 * - patchInfluencerMe ile güncelleme yapar; başarıda non-intrusive toast benzeri mesaj gösterir.
 * - Erişilebilirlik: label-for/id eşleşmesi, role="alert", aria-busy.
 * - Glassmorphism ve minimal mikro etkileşimler uygulanır.
 * - Şifre değiştirme, sosyal medya hesapları ve ödeme bilgileri yönetimi eklendi.
 */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Influencer,
  patchInfluencerMe,
  patchInfluencerMePassword,
  getInfluencerSocialAccounts,
  addInfluencerSocialAccount,
  updateInfluencerSocialAccount,
  deleteInfluencerSocialAccount,
  getInfluencerPaymentAccounts,
  addInfluencerPaymentAccount,
  SocialAccount,
  PaymentAccount,
  ApiError
} from '@/lib/api';

type ProfileFormState = {
  name: string;
  social_handle: string;
  niche: string;
  channels: string;
  country: string;
  bio: string;
  website: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type SocialAccountFormState = {
  platform: string;
  handle: string;
  url: string;
};

type PaymentAccountFormState = {
  bank_name: string;
  account_holder_name: string;
  iban: string;
};

export default function ProfileForm({ initial }: { initial: Influencer }) {
  // Genel profil bilgileri state'i
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: initial.name ?? '',
    social_handle: initial.social_handle ?? '',
    niche: initial.niche ?? '',
    channels: (initial.channels ?? []).join(', '),
    country: initial.country ?? '',
    bio: initial.bio ?? '',
    website: initial.website ?? ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileServerError, setProfileServerError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Şifre değiştirme state'i
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Sosyal hesaplar state'i
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialForm, setSocialForm] = useState<SocialAccountFormState>({
    platform: '',
    handle: '',
    url: ''
  });
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialServerError, setSocialServerError] = useState<string | null>(null);
  const [socialSuccess, setSocialSuccess] = useState<string | null>(null);

  // Ödeme hesapları state'i
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentAccountFormState>({
    bank_name: '',
    account_holder_name: '',
    iban: ''
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentServerError, setPaymentServerError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Veri çekme (sosyal ve ödeme hesapları)
  useEffect(() => {
    async function fetchData() {
      try {
        const social = await getInfluencerSocialAccounts();
        setSocialAccounts(social);
        const payment = await getInfluencerPaymentAccounts();
        setPaymentAccounts(payment);
      } catch (err: any) {
        console.error('Veri çekme hatası:', err);
        // Hata yönetimi eklenebilir
      }
    }
    fetchData();
  }, []);

  // Genel profil formu doğrulama
  const profileRequiredFields: (keyof ProfileFormState)[] = ['name', 'social_handle', 'niche', 'channels', 'country'];
  const isProfileFormValid = useMemo(() => {
    if (!profileRequiredFields.every((k) => String(profileForm[k] ?? '').trim().length > 0)) return false;
    return true;
  }, [profileForm]);

  // Şifre formu doğrulama
  const isPasswordFormValid = useMemo(() => {
    return (
      passwordForm.currentPassword.length > 0 &&
      passwordForm.newPassword.length >= 6 &&
      passwordForm.newPassword === passwordForm.confirmNewPassword
    );
  }, [passwordForm]);

  // Sosyal hesap formu doğrulama
  const isSocialFormValid = useMemo(() => {
    return socialForm.platform.length > 0 && socialForm.handle.length > 0;
  }, [socialForm]);

  // Ödeme hesap formu doğrulama
  const isPaymentFormValid = useMemo(() => {
    return (
      paymentForm.bank_name.length > 0 &&
      paymentForm.account_holder_name.length > 0 &&
      paymentForm.iban.length > 0
    );
  }, [paymentForm]);

  // Genel profil bilgileri submit
  async function onProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileServerError(null);
    setProfileSuccess(null);
    if (!isProfileFormValid) return;
    setProfileSaving(true);
    try {
      const updated = await patchInfluencerMe({
        name: profileForm.name.trim(),
        social_handle: profileForm.social_handle.trim(),
        niche: profileForm.niche.trim(),
        channels: profileForm.channels.split(',').map((s) => s.trim()).filter(Boolean),
        country: profileForm.country.trim(),
        bio: profileForm.bio.trim() || null,
        website: profileForm.website.trim() || null
      });
      setProfileForm({
        name: updated.name ?? '',
        social_handle: updated.social_handle ?? '',
        niche: updated.niche ?? '',
        channels: (updated.channels ?? []).join(', '),
        country: updated.country ?? '',
        bio: updated.bio ?? '',
        website: updated.website ?? ''
      });
      setProfileSuccess('Profil başarıyla güncellendi.');
    } catch (err: any) {
      setProfileServerError(err?.message || 'Güncelleme başarısız.');
    } finally {
      setProfileSaving(false);
    }
  }

  // Şifre değiştirme submit
  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordServerError(null);
    setPasswordSuccess(null);
    if (!isPasswordFormValid) {
      setPasswordServerError('Lütfen şifre alanlarını kontrol edin.');
      return;
    }
    setPasswordSaving(true);
    try {
      await patchInfluencerMePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess('Şifre başarıyla değiştirildi.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // Formu temizle
    } catch (err: any) {
      setPasswordServerError(err?.message || 'Şifre değiştirme başarısız.');
    } finally {
      setPasswordSaving(false);
    }
  }

  // Sosyal hesap ekleme submit
  async function onSocialAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSocialServerError(null);
    setSocialSuccess(null);
    if (!isSocialFormValid) return;
    setSocialSaving(true);
    try {
      const newAccount = await addInfluencerSocialAccount(socialForm);
      setSocialAccounts((prev) => [...prev, newAccount]);
      setSocialSuccess('Sosyal hesap başarıyla eklendi.');
      setSocialForm({ platform: '', handle: '', url: '' }); // Formu temizle
    } catch (err: any) {
      setSocialServerError(err?.message || 'Sosyal hesap ekleme başarısız.');
    } finally {
      setSocialSaving(false);
    }
  }

  // Sosyal hesap durumunu değiştirme (aktif/pasif)
  async function onSocialToggleActive(id: number, currentStatus: boolean) {
    setSocialServerError(null);
    setSocialSuccess(null);
    try {
      const updatedAccount = await updateInfluencerSocialAccount(id, { is_active: !currentStatus });
      setSocialAccounts((prev) =>
        prev.map((acc) => (acc.id === id ? updatedAccount : acc))
      );
      setSocialSuccess('Sosyal hesap durumu güncellendi.');
    } catch (err: any) {
      setSocialServerError(err?.message || 'Sosyal hesap durumu güncelleme başarısız.');
    }
  }

  // Sosyal hesap silme
  async function onSocialDelete(id: number) {
    setSocialServerError(null);
    setSocialSuccess(null);
    if (!window.confirm('Bu sosyal hesabı silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteInfluencerSocialAccount(id);
      setSocialAccounts((prev) => prev.filter((acc) => acc.id !== id));
      setSocialSuccess('Sosyal hesap başarıyla silindi.');
    } catch (err: any) {
      setSocialServerError(err?.message || 'Sosyal hesap silme başarısız.');
    }
  }

  // Ödeme hesabı ekleme submit
  async function onPaymentAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentServerError(null);
    setPaymentSuccess(null);
    if (!isPaymentFormValid) return;
    setPaymentSaving(true);
    try {
      const newAccount = await addInfluencerPaymentAccount(paymentForm);
      // Yeni hesap eklendiğinde diğerlerini pasif yapma mantığı backend'de olduğu için burada sadece listeyi güncelliyoruz
      const updatedAccounts = await getInfluencerPaymentAccounts(); // Güncel listeyi çek
      setPaymentAccounts(updatedAccounts);
      setPaymentSuccess('Ödeme hesabı başarıyla eklendi.');
      setPaymentForm({ bank_name: '', account_holder_name: '', iban: '' }); // Formu temizle
    } catch (err: any) {
      setPaymentServerError(err?.message || 'Ödeme hesabı ekleme başarısız.');
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Genel Profil Bilgileri */}
      <section className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <h2 className="text-xl font-semibold mb-4">Genel Profil Bilgileri</h2>
        <form onSubmit={onProfileSubmit} className="space-y-4">
          {profileServerError && (
            <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded p-2">
              {profileServerError}
            </div>
          )}
          {profileSuccess && (
            <div role="status" className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 rounded p-2">
              {profileSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm mb-1">İsim</label>
              <input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Ad Soyad"
              />
            </div>

            <div>
              <label htmlFor="social_handle" className="block text-sm mb-1">Sosyal Hesap</label>
              <input
                id="social_handle"
                value={profileForm.social_handle}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, social_handle: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="@kullanici"
              />
            </div>

            <div>
              <label htmlFor="niche" className="block text-sm mb-1">Niş</label>
              <input
                id="niche"
                value={profileForm.niche}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, niche: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Teknoloji, Moda, Oyun..."
              />
            </div>

            <div>
              <label htmlFor="channels" className="block text-sm mb-1">Kanallar (virgülle)</label>
              <input
                id="channels"
                value={profileForm.channels}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, channels: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="YouTube, Instagram, TikTok"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm mb-1">Ülke</label>
              <input
                id="country"
                value={profileForm.country}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Türkiye"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="bio" className="block text-sm mb-1">Biyografi</label>
              <textarea
                id="bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Kendinizden kısaca bahsedin (opsiyonel)"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="website" className="block text-sm mb-1">Web Sitesi (opsiyonel)</label>
              <input
                id="website"
                value={profileForm.website}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              aria-busy={profileSaving}
              disabled={!isProfileFormValid || profileSaving}
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              {profileSaving ? 'Kaydediliyor…' : 'Profili Kaydet'}
            </button>
          </div>
        </form>
      </section>

      {/* Şifre Değiştirme */}
      <section className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <h2 className="text-xl font-semibold mb-4">Şifre Değiştir</h2>
        <form onSubmit={onPasswordSubmit} className="space-y-4">
          {passwordServerError && (
            <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded p-2">
              {passwordServerError}
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 rounded p-2">
              {passwordSuccess}
            </div>
          )}
          <div>
            <label htmlFor="currentPassword" className="block text-sm mb-1">Mevcut Şifre</label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Mevcut Şifreniz"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm mb-1">Yeni Şifre</label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Yeni Şifreniz (en az 6 karakter)"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm mb-1">Yeni Şifre Tekrar</label>
            <input
              id="confirmNewPassword"
              type="password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Yeni Şifrenizi Tekrar Girin"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              aria-busy={passwordSaving}
              disabled={!isPasswordFormValid || passwordSaving}
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              {passwordSaving ? 'Değiştiriliyor…' : 'Şifreyi Değiştir'}
            </button>
          </div>
        </form>
      </section>

      {/* Sosyal Platform Hesapları */}
      <section className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <h2 className="text-xl font-semibold mb-4">Sosyal Platform Hesapları</h2>
        {socialServerError && (
          <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded p-2 mb-4">
            {socialServerError}
          </div>
        )}
        {socialSuccess && (
          <div role="status" className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 rounded p-2 mb-4">
            {socialSuccess}
          </div>
        )}

        {/* Mevcut Hesaplar */}
        {socialAccounts.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {socialAccounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between p-3 border border-white/10 rounded-md bg-white/5">
                <div>
                  <p className="font-medium">{account.platform}: {account.handle}</p>
                  {account.url && <p className="text-sm text-muted">{account.url}</p>}
                  <p className="text-xs text-muted">Durum: {account.is_active ? 'Aktif' : 'Pasif'}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onSocialToggleActive(account.id, account.is_active)}
                    className={`px-3 py-1 rounded-md text-sm ${account.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white transition`}
                  >
                    {account.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                  </button>
                  <button
                    onClick={() => onSocialDelete(account.id)}
                    className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm transition"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Henüz eklenmiş sosyal hesap bulunmamaktadır.</p>
        )}

        {/* Yeni Hesap Ekle Formu */}
        <h3 className="text-lg font-semibold mb-3">Yeni Hesap Ekle</h3>
        <form onSubmit={onSocialAddSubmit} className="space-y-4">
          <div>
            <label htmlFor="socialPlatform" className="block text-sm mb-1">Platform</label>
            <input
              id="socialPlatform"
              value={socialForm.platform}
              onChange={(e) => setSocialForm((prev) => ({ ...prev, platform: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Instagram, YouTube, TikTok vb."
            />
          </div>
          <div>
            <label htmlFor="socialHandle" className="block text-sm mb-1">Hesap Adı / Kanal</label>
            <input
              id="socialHandle"
              value={socialForm.handle}
              onChange={(e) => setSocialForm((prev) => ({ ...prev, handle: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="@kullanici veya Kanal Adı"
            />
          </div>
          <div>
            <label htmlFor="socialUrl" className="block text-sm mb-1">Profil URL (Opsiyonel)</label>
            <input
              id="socialUrl"
              type="url"
              value={socialForm.url}
              onChange={(e) => setSocialForm((prev) => ({ ...prev, url: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="https://instagram.com/kullanici"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              aria-busy={socialSaving}
              disabled={!isSocialFormValid || socialSaving}
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              {socialSaving ? 'Ekleniyor…' : 'Hesap Ekle'}
            </button>
          </div>
        </form>
      </section>

      {/* Ödeme Bilgileri */}
      <section className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <h2 className="text-xl font-semibold mb-4">Ödeme Bilgileri</h2>
        {paymentServerError && (
          <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded p-2 mb-4">
            {paymentServerError}
          </div>
        )}
        {paymentSuccess && (
          <div role="status" className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-800/40 rounded p-2 mb-4">
            {paymentSuccess}
          </div>
        )}

        {/* Mevcut Hesaplar */}
        {paymentAccounts.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {paymentAccounts.map((account) => (
              <li key={account.id} className={`p-3 border rounded-md ${account.is_active ? 'border-emerald-500 bg-emerald-900/20' : 'border-white/10 bg-white/5'}`}>
                <p className="font-medium">{account.bank_name} - {account.account_holder_name}</p>
                <p className="text-sm text-muted">IBAN: {account.iban}</p>
                <p className="text-xs text-muted">Durum: {account.is_active ? 'Aktif' : 'Pasif'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Henüz eklenmiş ödeme hesabı bulunmamaktadır.</p>
        )}

        {/* Yeni Hesap Ekle Formu */}
        <h3 className="text-lg font-semibold mb-3">Yeni Ödeme Hesabı Ekle</h3>
        <form onSubmit={onPaymentAddSubmit} className="space-y-4">
          <div>
            <label htmlFor="bankName" className="block text-sm mb-1">Banka Adı</label>
            <input
              id="bankName"
              value={paymentForm.bank_name}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, bank_name: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Banka Adı"
            />
          </div>
          <div>
            <label htmlFor="accountHolderName" className="block text-sm mb-1">Hesap Sahibi Adı</label>
            <input
              id="accountHolderName"
              value={paymentForm.account_holder_name}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Hesap Sahibi Adı Soyadı"
            />
          </div>
          <div>
            <label htmlFor="iban" className="block text-sm mb-1">IBAN</label>
            <input
              id="iban"
              value={paymentForm.iban}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, iban: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="TRXXXXXXXXXXXXXXXXXXXXXXXXXX"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              aria-busy={paymentSaving}
              disabled={!isPaymentFormValid || paymentSaving}
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              {paymentSaving ? 'Ekleniyor…' : 'Hesap Ekle'}
            </button>
          </div>
        </form>
      </section>

      {/* Güncel Sözleşme Linki */}
      <section className="rounded-xl border border-app bg-panel p-6 shadow-xl card-hover">
        <h2 className="text-xl font-semibold mb-4">Sözleşmeler</h2>
        <p className="text-sm text-muted">
          <a href="/docs/API_DOKUMANTASYON.md" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
            Güncel Sözleşme Metni (Örnek)
          </a>
        </p>
      </section>
    </div>
  );
}