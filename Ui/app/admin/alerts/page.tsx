'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createAlert, deleteAlert, listAlerts, searchInfluencers } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';

interface Alert {
  id: number;
  message: string;
  created_at: string;
  target_influencer_ids?: string;
}

interface Influencer {
  id: number;
  name: string;
  email: string;
}

export default function AdminAlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAlertMessage, setNewAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Influencer search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Influencer[]>([]);
  const [targetInfluencers, setTargetInfluencers] = useState<Influencer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await listAlerts();
        setAlerts(data);
      } catch (err: any) {
        setError(err.message || 'Uyarılar alınamadı');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchInfluencers(query);
        setSearchResults(results.filter(r => !targetInfluencers.some(t => t.id === r.id)));
      } catch (error) {
        console.error('Arama sırasında hata:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [targetInfluencers]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const addTargetInfluencer = (influencer: Influencer) => {
    if (!targetInfluencers.some(t => t.id === influencer.id)) {
      setTargetInfluencers([...targetInfluencers, influencer]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeTargetInfluencer = (influencerId: number) => {
    setTargetInfluencers(targetInfluencers.filter(t => t.id !== influencerId));
  };

  const handleCreateAlert = async () => {
    if (!newAlertMessage.trim()) {
      setError('Lütfen bir mesaj girin');
      return;
    }

    const target_influencer_ids = targetInfluencers.map(t => t.id);

    if (target_influencer_ids.length === 0) {
      if (!confirm('Hiç influencer seçmediniz. Bu uyarı TÜM influencerlara gönderilsin mi?')) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newAlert = await createAlert({
        message: newAlertMessage,
        target_influencer_ids: target_influencer_ids.length > 0 ? target_influencer_ids : undefined,
      });
      setAlerts(prev => [newAlert, ...prev]);
      setNewAlertMessage('');
      setTargetInfluencers([]);
    } catch (err: any) {
      setError(err.message || 'Uyarı oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!confirm('Bu uyarıyı silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await deleteAlert(id);
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (err: any) {
      setError(err.message || 'Uyarı silinemedi');
    }
  };

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Sistem Uyarıları (Duyurular)</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 mb-6">
            {error}
          </div>
        )}

        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Yeni Duyuru Oluştur</h2>
          
          {/* Influencer Search */}
          <div className="mb-4">
            <label htmlFor="influencer-search" className="block text-sm font-medium text-gray-300 mb-2">
              Kime (Influencer Ekle):
            </label>
            <div className="relative">
              <input
                id="influencer-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İsim veya e-posta ile ara..."
                className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400"
              />
              {isSearching && <p className="absolute right-3 top-2 text-sm text-gray-400">Aranıyor...</p>}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((inf) => (
                    <div
                      key={inf.id}
                      onClick={() => addTargetInfluencer(inf)}
                      className="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                    >
                      <p className="font-semibold">{inf.name}</p>
                      <p className="text-sm text-gray-400">{inf.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Target Influencers */}
          {targetInfluencers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Seçili Influencerlar:</p>
              <div className="flex flex-wrap gap-2">
                {targetInfluencers.map(inf => (
                  <div key={inf.id} className="flex items-center bg-purple-600/50 text-white text-sm rounded-full px-3 py-1">
                    <span>{inf.name}</span>
                    <button onClick={() => removeTargetInfluencer(inf.id)} className="ml-2 text-lg font-bold">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Textarea */}
          <div className="mb-4">
            <label htmlFor="alert-message" className="block text-sm font-medium text-gray-300 mb-2">
              Mesaj:
            </label>
            <textarea
              id="alert-message"
              value={newAlertMessage}
              onChange={(e) => setNewAlertMessage(e.target.value)}
              placeholder={targetInfluencers.length === 0 ? "Tüm influencer'lara gönderilecek mesaj..." : "Seçili influencer'lara gönderilecek mesaj..."}
              className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-500 min-h-[100px]"
            />
          </div>
          
          <div className="text-right">
            <button
              onClick={handleCreateAlert}
              disabled={isSubmitting || !newAlertMessage.trim()}
              className="px-6 py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Duyuruyu Gönder'}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Geçmiş Duyurular</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-400">Henüz hiç duyuru bulunmamaktadır.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800/50">
                  <p className="text-gray-300 mb-2">{alert.message}</p>
                  <div className="flex justify-between items-end">
                     <p className="text-xs text-gray-500">
                      Hedef: {alert.target_influencer_ids ? `${JSON.parse(alert.target_influencer_ids).length} influencer` : 'Tümü'}
                      <br/>
                      Tarih: {new Date(alert.created_at).toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
