'use client';

import React, { useState, useEffect } from 'react';

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
    return <div className="text-center p-8">Sözleşme yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600">Hata: {error}</div>;
  }

  if (!contract) {
    return <div className="text-center p-8">Sözleşme bulunamadı.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Güncel Sözleşme</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Versiyon: v{contract.version} • 
            Oluşturulma Tarihi: {new Date(contract.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <div className="p-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {contract.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
