
'use client';

import React, { useState } from 'react';

type QuickSaleFormProps = {
  onSaleAdded?: () => void;
};

export default function QuickSaleForm({ onSaleAdded }: QuickSaleFormProps) {
  const [saleCode, setSaleCode] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleCustomer, setSaleCustomer] = useState('');
  const [saleProduct, setSaleProduct] = useState('');
  const [saleBusy, setSaleBusy] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState<string | null>(null);

  async function handleQuickSaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaleBusy(true);
    setSaleError(null);
    setSaleSuccess(null);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify({
          code: saleCode,
          total_amount: parseFloat(saleAmount),
          customer_url: saleCustomer,
          product: saleProduct,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text || '{}');
          msg = j?.message || j?.error || msg;
        } catch (error) {
          console.error(error);
        }
        throw new Error(msg || 'Satış kaydı başarısız');
      }
      setSaleSuccess('Satış başarıyla eklendi.');
      setSaleCode('');
      setSaleAmount('');
      setSaleCustomer('');
      setSaleProduct('');
      
      if (onSaleAdded) {
        onSaleAdded();
      }

    } catch (e: any) {
      setSaleError(e?.message || 'Satış kaydı başarısız.');
    } finally {
      setSaleBusy(false);
    }
  }

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Hızlı Satış Gir</h2>
      <form onSubmit={handleQuickSaleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <label htmlFor="sale-code" className="block text-sm font-medium text-gray-700">Influencer Kodu</label>
          <input
            id="sale-code"
            type="text"
            value={saleCode}
            onChange={(e) => setSaleCode(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="örn: TESTQUFDLE"
          />
        </div>
        <div className="lg:col-span-1">
          <label htmlFor="sale-amount" className="block text-sm font-medium text-gray-700">Satış Tutarı (₺)</label>
          <input
            id="sale-amount"
            type="number"
            step="0.01"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="örn: 250.50"
          />
        </div>
        <div className="lg:col-span-1">
          <label htmlFor="sale-customer" className="block text-sm font-medium text-gray-700">Müşteri Adı</label>
          <input
            id="sale-customer"
            type="text"
            value={saleCustomer}
            onChange={(e) => setSaleCustomer(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="örn: Ali Veli"
          />
        </div>
        <div className="lg:col-span-1">
          <label htmlFor="sale-product" className="block text-sm font-medium text-gray-700">Ürün Adı</label>
          <input
            id="sale-product"
            type="text"
            value={saleProduct}
            onChange={(e) => setSaleProduct(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="örn: Gömlek"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saleBusy}
            className="w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saleBusy ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </form>
      {saleError && <p className="mt-2 text-sm text-red-600">{saleError}</p>}
      {saleSuccess && <p className="mt-2 text-sm text-green-600">{saleSuccess}</p>}
    </div>
  );
}
