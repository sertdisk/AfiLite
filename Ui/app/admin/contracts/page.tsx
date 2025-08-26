'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contract {
  id: number;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [newContractContent, setNewContractContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sözleşmeleri getir
  const fetchContracts = async () => {
    try {
      setLoading(true);
      // Burada API çağrısı yapılacak
      // const response = await fetch('/api/contracts');
      // const data = await response.json();
      // setContracts(data);
      
      // Geçici mock data
      setContracts([
        {
          id: 1,
          content: 'İlk sözleşme versiyonu içeriği...',
          version: 1,
          is_active: true,
          created_at: '2025-08-10T00:00:00Z',
          updated_at: '2025-08-10T00:00:00Z'
        }
      ]);
    } catch (err) {
      setError('Sözleşmeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Yeni sözleşme oluştur
  const createNewContract = async () => {
    if (!newContractContent.trim()) {
      alert('Sözleşme içeriği boş olamaz.');
      return;
    }

    try {
      // Burada API çağrısı yapılacak
      // const response = await fetch('/api/contracts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content: newContractContent })
      // });
      
      // Yeni sözleşme oluşturulduktan sonra listeyi yenile
      setNewContractContent('');
      fetchContracts();
      alert('Yeni sözleşme versiyonu oluşturuldu ve aktif hale getirildi.');
    } catch (err) {
      alert('Yeni sözleşme oluşturulurken bir hata oluştu.');
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sözleşme Yönetimi</h1>
      
      {/* Yeni Sözleşme Oluşturma */}
      <div className="border border-app rounded-md p-4">
        <h2 className="text-lg font-semibold mb-3">Yeni Sözleşme Versiyonu</h2>
        <textarea
          value={newContractContent}
          onChange={(e) => setNewContractContent(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-app bg-panel px-3 py-2 text-app placeholder:text-muted focus-ring transition"
          placeholder="Yeni sözleşme içeriğini buraya yazın..."
        />
        <button
          onClick={createNewContract}
          className="mt-3 inline-flex items-center rounded-md px-4 py-2 bg-gray-800 text-gray-200 hover:bg-gray-700 focus-ring transition"
        >
          Yeni Versiyon Oluştur
        </button>
      </div>
      
      {/* Mevcut Sözleşmeler */}
      <div className="border border-app rounded-md p-4">
        <h2 className="text-lg font-semibold mb-3">Mevcut Sözleşme Versiyonları</h2>
        {contracts.length === 0 ? (
          <p>Henüz hiç sözleşme versiyonu oluşturulmamış.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-app">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Versiyon</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Durum</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Oluşturulma Tarihi</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-4 py-2 text-sm">v{contract.version}</td>
                    <td className="px-4 py-2 text-sm">
                      {contract.is_active ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Aktif</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Pasif</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(contract.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => {
                          // Sözleşme detay sayfasına git
                          router.push(`/admin/contracts/${contract.id}`);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Görüntüle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}