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
    <div className="container mx-auto p-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Güncel Sözleşme (Versiyon: v{contract.version})</h1>
      <div className="prose max-w-none text-gray-700 leading-relaxed text-base p-4">
        <div dangerouslySetInnerHTML={{ __html: contract.content }} />
      </div>
    </div>
  );
}
