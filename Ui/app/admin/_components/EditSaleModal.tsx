
'use client';

import React, { useState, useEffect } from 'react';

// Sale verisi için tip tanımı
type Sale = {
  id: number;
  influencer_code: string;
  influencer_brand_name: string;
  customer_url: string;
  product_info: string;
  sale_amount: number;
  commission_amount: number;
};

type EditSaleModalProps = {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSale: Sale) => Promise<void>;
};

export default function EditSaleModal({ sale, isOpen, onClose, onSave }: EditSaleModalProps) {
  const [formData, setFormData] = useState<Partial<Sale>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sale) {
      setFormData(sale);
    } else {
      setFormData({});
    }
  }, [sale]);

  if (!isOpen || !sale) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(formData as Sale);
      onClose(); // Başarılı olunca kapat
    } catch (e: any) {
      setError(e.message || 'Güncelleme sırasında bir hata oluştu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl text-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Satış Düzenle (ID: {sale.id})</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Influencer Kodu</label>
            <input type="text" name="influencer_code" value={formData.influencer_code || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Müşteri</label>
            <input type="text" name="customer_url" value={formData.customer_url || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ürün Bilgisi</label>
            <input type="text" name="product_info" value={formData.product_info || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ürün Tutarı</label>
            <input type="number" name="sale_amount" value={formData.sale_amount || 0} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Influencer Komisyonu</label>
            <input type="number" name="commission_amount" value={formData.commission_amount || 0} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">İptal</button>
            <button type="submit" disabled={busy} className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50">
              {busy ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
