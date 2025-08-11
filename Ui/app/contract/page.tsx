import React from 'react';
import { getActiveContract } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ContractPage() {
  let contract = null;
  let error = null;
  
  try {
    contract = await getActiveContract();
  } catch (err) {
    error = 'Sözleşme yüklenirken bir hata oluştu.';
    console.error('Contract fetch error:', err);
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Influencer Sözleşmesi</h1>
      
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : !contract ? (
        <div>Sözleşme bulunamadı.</div>
      ) : (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: contract.content }}
        />
      )}
    </div>
  );
}