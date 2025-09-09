/* /admin/settings — Ayarlar */
'use client';
import React, { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  // Komisyon oran ayarlama için state'ler
  const [commissionSettings, setCommissionSettings] = useState({
    discount_pct: 10,
    commission_pct: 10
  });
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);
  const [commissionUpdateResult, setCommissionUpdateResult] = useState<{message?: string, error?: string} | null>(null);

  // Sözleşme güncelleme için state'ler
  const [contractContent, setContractContent] = useState('');
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [contractCreateResult, setContractCreateResult] = useState<{message?: string, error?: string} | null>(null);
  const [contracts, setContracts] = useState<Array<{id: number, version: number, is_active: boolean, created_at: string}>>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Sözleşmeleri getir
  const fetchContracts = async () => {
    setLoadingContracts(true);
    try {
      const response = await fetch('/api/contracts', {
        credentials: 'include' // Oturum çerezlerini göndermek için eklendi
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setContracts(data);
      } else {
        console.error('API did not return an array:', data);
        setContracts([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Sözleşmeler yüklenirken hata:', error);
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // Komisyon oranlarını güncelle
  const updateCommissionRates = async () => {
    if (commissionSettings.discount_pct < 1 || commissionSettings.discount_pct > 100) {
      alert('İndirim yüzdesi 1-100 arasında olmalıdır');
      return;
    }
    if (commissionSettings.commission_pct < 1 || commissionSettings.commission_pct > 100) {
      alert('Komisyon yüzdesi 1-100 arasında olmalıdır');
      return;
    }

    setIsUpdatingCommission(true);
    setCommissionUpdateResult(null);
    try {
      const response = await fetch('/api/admin/settings/commission-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commissionSettings),
        credentials: 'include' // Oturum çerezlerini göndermek için eklendi
      });
      const result = await response.json();
      setCommissionUpdateResult(result);
      if (response.ok) {
        alert('Komisyon oranları başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Komisyon oranları güncellenirken hata:', error);
      setCommissionUpdateResult({ error: 'Güncelleme sırasında bir hata oluştu' });
    } finally {
      setIsUpdatingCommission(false);
    }
  };

  // Yeni sözleşme oluştur
  const createNewContract = async () => {
    if (!contractContent.trim()) {
      alert('Sözleşme içeriği boş olamaz');
      return;
    }

    setIsCreatingContract(true);
    setContractCreateResult(null);
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contractContent }),
        credentials: 'include' // Oturum çerezlerini göndermek için eklendi
      });
      const result = await response.json();
      setContractCreateResult(result);
      if (response.ok) {
        setContractContent('');
        fetchContracts(); // Sözleşmeleri yeniden yükle
        alert('Yeni sözleşme versiyonu oluşturuldu');
      }
    } catch (error) {
      console.error('Sözleşme oluşturulurken hata:', error);
      setContractCreateResult({ error: 'Sözleşme oluşturulurken bir hata oluştu' });
    } finally {
      setIsCreatingContract(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>
      
      {/* Komisyon Oran Ayarlama */}
      <div className="border rounded-md p-4">
        <h2 className="text-xl font-semibold mb-4">Komisyon/İndirim Oran Ayarlama</h2>
        <p className="text-sm text-muted mb-4">
          Tüm influencerların mevcut tüm influencer kodlarının komisyon oranlarını buradan güncelleyebilirsiniz.
          Bu değişiklikten önceki satışlardaki komisyonlar korunur, yeni satışlardan yeni oranlar uygulanır.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">İndirim Yüzdesi (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={commissionSettings.discount_pct}
              onChange={(e) => setCommissionSettings({
                ...commissionSettings,
                discount_pct: parseInt(e.target.value) || 0
              })}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Komisyon Yüzdesi (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={commissionSettings.commission_pct}
              onChange={(e) => setCommissionSettings({
                ...commissionSettings,
                commission_pct: parseInt(e.target.value) || 0
              })}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>
        
        <button
          onClick={updateCommissionRates}
          disabled={isUpdatingCommission}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isUpdatingCommission ? 'Güncelleniyor...' : 'Oranları Güncelle'}
        </button>
        
        {commissionUpdateResult && (
          <div className={`mt-2 text-sm ${commissionUpdateResult.error ? 'text-red-500' : 'text-green-500'}`}>
            {commissionUpdateResult.error || commissionUpdateResult.message}
          </div>
        )}
      </div>
      
      {/* Sözleşme Yönetimi */}
      <div className="border rounded-md p-4">
        <h2 className="text-xl font-semibold mb-4">Sözleşme Yönetimi</h2>
        <p className="text-sm text-muted mb-4">
          Yeni sözleşme versiyonu oluşturun. Eski sözleşmeler arşivlenir ve yeni sözleşme tüm influencer başvurularında ve alanlarında geçerli olur.
        </p>
        
        {/* Yeni Sözleşme Oluşturma */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Yeni Sözleşme İçeriği</label>
          <textarea
            value={contractContent}
            onChange={(e) => setContractContent(e.target.value)}
            rows={10}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Yeni sözleşme içeriğini buraya yazın..."
          />
          <button
            onClick={createNewContract}
            disabled={isCreatingContract || !contractContent.trim()}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isCreatingContract ? 'Oluşturuluyor...' : 'Yeni Sözleşme Oluştur'}
          </button>
          
          {contractCreateResult && (
            <div className={`mt-2 text-sm ${contractCreateResult.error ? 'text-red-500' : 'text-green-500'}`}>
              {contractCreateResult.error || contractCreateResult.message}
            </div>
          )}
        </div>
        
        {/* Mevcut Sözleşmeler */}
        <div>
          <h3 className="text-lg font-medium mb-2">Mevcut Sözleşme Versiyonları</h3>
          {loadingContracts ? (
            <p className="text-sm text-muted">Yükleniyor...</p>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted">Henüz sözleşme versiyonu oluşturulmamış.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Versiyon</th>
                    <th className="text-left py-2 px-3">Durum</th>
                    <th className="text-left py-2 px-3">Oluşturulma Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="border-b">
                      <td className="py-2 px-3">v{contract.version}</td>
                      <td className="py-2 px-3">
                        {contract.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Aktif</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Pasif</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {new Date(contract.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}