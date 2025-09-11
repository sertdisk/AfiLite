/* /contract — Güncel sözleşme görüntüleme sayfası */
'use client';

import React, { useEffect, useState } from 'react';

export default function ContractPage() {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch('/api/contracts/active');
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-gray-500">Aktif sözleşme bulunamadı</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Güncel Sözleşme</h1>
          <p className="text-sm text-gray-500 mt-1">
            Versiyon: v{contract.version} • 
            Oluşturulma Tarihi: {new Date(contract.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <div className="p-6">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {contract.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}