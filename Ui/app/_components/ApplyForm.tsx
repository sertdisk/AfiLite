'use client';

import React, { useState, useEffect } from 'react';

const ApplyForm = () => {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch('/api/admin/settings/contract/active');
        if (!response.ok) {
          throw new Error('Sözleşme yüklenirken hata oluştu');
        }
        const data = await response.json();
        setContract(data);
      } catch (err: any) {
        setError(err.message || 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Influencer Başvuru Formu</h2>
      
      {/* Form alanları */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ad Soyad *
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Adınızı ve soyadınızı girin"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-posta *
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="E-posta adresinizi girin"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon *
          </label>
          <input
            type="tel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Telefon numaranızı girin"
          />
        </div>
      </div>
      
      {/* Sözleşme onayı */}
      <div className="border rounded-md p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="contract-agreement"
            className="mt-1 mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="contract-agreement" className="text-sm text-gray-700">
            <span className="font-medium">Sözleşme Onayı:</span> Başvurunuzu tamamlamadan önce
            {' '}
            <button
              type="button"
              onClick={() => setShowContract(true)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              güncel sözleşmeyi
            </button>
            {' '}
            okuduğunuzu ve kabul ettiğinizi onaylamanız gerekmektedir.
          </label>
        </div>
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Başvuruyu Gönder
      </button>
      
      {/* Sözleşme Modalı */}
      {showContract && contract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Güncel Sözleşme (Versiyon: v{contract.version})
              </h3>
              <button
                onClick={() => setShowContract(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {contract.content}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowContract(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sözleşme yükleme durumu */}
      {loading && (
        <div className="text-center text-gray-500">
          Sözleşme yükleniyor...
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default ApplyForm;
