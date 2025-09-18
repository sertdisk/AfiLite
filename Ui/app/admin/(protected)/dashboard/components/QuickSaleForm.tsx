'use client';

import React, { useState, useMemo } from 'react';
import { searchAdminCode, postAdminSale } from '@/lib/api';

interface InfluencerInfo {
  brandName: string;
  fullName: string;
  email: string;
  commissionRate: number | null;
}

interface QuickSaleFormData {
  // Influencer kodu
  code: string;
  
  // Influencer bilgileri (otomatik doldurulur)
  influencerInfo: InfluencerInfo | null;
  
  // Satış bilgileri
  customer: string;
  product: string;
  amount: number | string;
  note: string;
}

export default function QuickSaleForm() {
  const [formData, setFormData] = useState<QuickSaleFormData>({
    code: '',
    influencerInfo: null,
    customer: '',
    product: '',
    amount: '',
    note: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Komisyon tutarını hesapla
  const commission = useMemo(() => {
    if (!formData.influencerInfo?.commissionRate || !formData.amount) {
      return 0;
    }
    
    const amountNum = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;
    if (isNaN(amountNum)) return 0;
    
    const commissionAmount = amountNum * (formData.influencerInfo.commissionRate / 100);
    return Math.max(0, Math.round(commissionAmount * 100) / 100);
  }, [formData.influencerInfo?.commissionRate, formData.amount]);

  // Influencer kodunu ara
  const searchCode = async (code: string) => {
    if (!code.trim()) {
      setFormData(prev => ({ ...prev, influencerInfo: null }));
      setCodeError(null);
      return;
    }
    
    // Kod formatını kontrol et
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 2) {
      setCodeError('Kod en az 2 karakter olmalıdır');
      return;
    }
    
    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      setCodeError('Kod sadece harf ve rakam içerebilir');
      return;
    }
    
    setCodeLoading(true);
    setCodeError(null);
    
    try {
      const response = await searchAdminCode(cleanCode);
      const codeData = response.code;
      
      if (!codeData?.id) {
        setCodeError('Geçersiz kod bilgisi alındı');
        setFormData(prev => ({ ...prev, influencerInfo: null }));
        return;
      }
      
      // Influencer bilgilerini ayarla
      setFormData(prev => ({
        ...prev,
        influencerInfo: {
          brandName: codeData.influencer_brand_name || '',
          fullName: codeData.influencer_name || '',
          email: codeData.influencer_email || '',
          commissionRate: codeData.commission_pct ?? codeData.commission_rate ?? null
        }
      }));
    } catch (err: any) {
      console.error('Kod arama hatası:', err);
      if (err?.status === 404) {
        setCodeError(`"${cleanCode}" kodu bulunamadı veya aktif değil`);
      } else if (err?.status === 400) {
        setCodeError(err?.message || 'Geçersiz kod formatı');
      } else {
        setCodeError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setFormData(prev => ({ ...prev, influencerInfo: null }));
    } finally {
      setCodeLoading(false);
    }
  };

  // Form alanlarını güncelle
  const handleInputChange = (field: keyof QuickSaleFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Kod alanı değiştiğinde otomatik arama yap
    if (field === 'code') {
      const codeValue = value as string;
      if (codeValue.trim().length >= 2) {
        // Debounce ile arama yap
        const timer = setTimeout(() => {
          searchCode(codeValue);
        }, 300);
        return () => clearTimeout(timer);
      } else {
        setCodeError(null);
        setFormData(prev => ({ ...prev, influencerInfo: null }));
      }
    }
  };

  // Satış kaydet
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validasyon
    if (!formData.code.trim()) {
      setError('İndirim kodu zorunludur');
      return;
    }
    
    if (!formData.influencerInfo) {
      setError('Geçerli bir indirim kodu giriniz');
      return;
    }
    
    if (!formData.customer.trim()) {
      setError('Müşteri bilgisi zorunludur');
      return;
    }
    
    if (!formData.product.trim()) {
      setError('Ürün bilgisi zorunludur');
      return;
    }
    
    const amountNum = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Geçerli bir tutar giriniz');
      return;
    }
    
    setLoading(true);
    
    try {
      const saleData = {
        code: formData.code.trim(),
        customer_url: formData.customer.trim(),
        product: formData.product.trim(),
        total_amount: amountNum,
        note: formData.note.trim() || undefined
      };
      
      const response = await postAdminSale(saleData);
      setSuccess(response?.message || 'Satış kaydedildi');
      
      // Formu sıfırla
      setFormData({
        code: '',
        influencerInfo: null,
        customer: '',
        product: '',
        amount: '',
        note: ''
      });
    } catch (err: any) {
      console.error('Satış kaydetme hatası:', err);
      setError(err?.message || 'Satış kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-md border card-like p-4">
      <h2 className="text-lg font-semibold mb-3">Hızlı Satış</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Bölüm: Influencer Kodu ve Bilgileri */}
        <div className="p-4 bg-gray-50 rounded-md">
          <h3 className="text-md font-medium mb-3">Kod ve Influencer Bilgileri</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* İndirim Kodu */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İndirim Kodu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Örn: AHMET15"
                  className="flex-1 rounded-md border px-3 py-2"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => searchCode(formData.code)}
                  disabled={codeLoading || !formData.code.trim() || formData.code.trim().length < 2}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-gradient-to-r from-cyan-500 to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center min-w-[60px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                >
                  {codeLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'Ara'}
                </button>
              </div>
              {codeError && (
                <div className="text-red-500 text-xs mt-1 p-2 bg-red-50 rounded">
                  {codeError}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Kod en az 2 karakter olmalı ve sadece harf/rakam içermelidir
              </div>
            </div>
            
            {/* Influencer Bilgileri */}
            {formData.influencerInfo && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marka Adı
                  </label>
                  <div className="w-full rounded-md bg-gray-800/50 backdrop-blur-xl border border-white/5 px-3 py-2 text-app font-medium text-sm min-h-[40px] flex items-center">
                    {formData.influencerInfo.brandName || '-'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <div className="w-full rounded-md bg-gray-800/50 backdrop-blur-xl border border-white/5 px-3 py-2 text-app font-medium text-sm min-h-[40px] flex items-center">
                    {formData.influencerInfo.fullName || '-'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kayıt Maili
                  </label>
                  <div className="w-full rounded-md bg-gray-800/50 backdrop-blur-xl border border-white/5 px-3 py-2 text-app font-medium text-sm min-h-[40px] flex items-center">
                    {formData.influencerInfo.email || '-'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Komisyon Oranı (%)
                  </label>
                  <div className="w-full rounded-md bg-gray-800/50 backdrop-blur-xl border border-white/5 px-3 py-2 text-app font-medium text-sm min-h-[40px] flex items-center">
                    {formData.influencerInfo.commissionRate ?? '-'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* 2. Bölüm: Satış Bilgileri */}
        <div className="p-4 bg-gray-50 rounded-md">
          <h3 className="text-md font-medium mb-3">Satış Bilgileri</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Müşteri */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Müşteri (URL veya açıklama)
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => handleInputChange('customer', e.target.value)}
                placeholder="Müşteri adı, URL veya açıklama"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            
            {/* Ürün */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün
              </label>
              <input
                type="text"
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
                placeholder="Ürün adı, SKU veya açıklama"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            
            {/* Tutar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tutar (₺)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            
            {/* Komisyon (otomatik) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Komisyon (₺) - Otomatik Hesaplanır
              </label>
              <div className="w-full rounded-md bg-gray-800/50 backdrop-blur-xl border border-white/5 px-3 py-2 text-app font-medium text-sm min-h-[40px] flex items-center">
                {commission}
              </div>
            </div>
            
            {/* Satış Notu */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Satış Notu (İsteğe Bağlı)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Satışla ilgili ek notlar..."
                rows={3}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        </div>
        
        {/* Hata ve Başarı Mesajları */}
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-500 text-sm p-2 bg-green-50 rounded">
            {success}
          </div>
        )}
        
        {/* Gönder Butonu */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !formData.influencerInfo}
            className="inline-flex items-center rounded-md bg-[#0f172a] text-white px-4 py-2 text-sm hover:bg-gradient-to-r from-cyan-500 to-violet-500 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            {loading ? 'Kaydediliyor…' : 'Satışı Kaydet'}
          </button>
        </div>
      </form>
    </section>
  );
}