'use client';

import React, { useState, useEffect } from 'react';
import { createAlert, deleteAlert, listAlerts } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Alert {
  id: number;
  message: string;
  created_at: string;
}

export default function AdminAlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAlertMessage, setNewAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreateAlert = async () => {
    if (!newAlertMessage.trim()) {
      setError('Lütfen bir mesaj girin');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newAlert = await createAlert({ message: newAlertMessage });
      setAlerts(prev => [newAlert, ...prev]);
      setNewAlertMessage('');
    } catch (err: any) {
      setError(err.message || 'Uyarı oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!confirm('Bu uyarıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
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
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Sistem Uyarıları</h1>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Sistem Uyarıları</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 mb-6">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Yeni Uyarı Oluştur</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <textarea
              value={newAlertMessage}
              onChange={(e) => setNewAlertMessage(e.target.value)}
              placeholder="Tüm kullanıcılara gönderilecek mesaj"
              className="flex-grow px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-500 min-h-[100px]"
            />
            <button
              onClick={handleCreateAlert}
              disabled={isSubmitting || !newAlertMessage.trim()}
              className={`px-6 py-2 rounded-lg font-bold ${
                isSubmitting || !newAlertMessage.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              } transition-colors duration-200`}
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Uyarı Gönder'}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Mevcut Uyarılar</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-400">Henüz hiç uyarı bulunmamaktadır.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-300">{alert.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Oluşturulma: {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
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