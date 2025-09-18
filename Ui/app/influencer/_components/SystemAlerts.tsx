'use client';

import React, { useState, useEffect } from 'react';
import { getUnreadAlerts, markAlertRead, SystemAlert } from '@/lib/api';

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const unreadAlerts = await getUnreadAlerts();
        setAlerts(unreadAlerts);
      } catch (err) {
        console.error('Sistem uyarıları alınamadı:', err);
      }
    }
    fetchAlerts();
  }, []);

  const handleDismissAlert = async (alertId: number) => {
    try {
      await markAlertRead(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error('Uyarı kapatma hatası:', e);
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {alerts.map(alert => (
        <aside key={alert.id} className="p-6 border-white/5 rounded-xl bg-gray-800/50 backdrop-blur-xl text-yellow-100 shadow-xl space-y-4 animate-fade-in">
          <p className="font-bold text-xl flex items-center text-yellow-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Sistem Uyarısı
          </p>
          <p className="text-base leading-relaxed text-gray-200">{alert.message}</p>
          <button
            onClick={() => handleDismissAlert(alert.id)}
            className="mt-4 px-6 py-2 rounded-lg bg-yellow-700 text-white font-semibold hover:bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300 ease-in-out shadow-md transform hover:scale-[1.02] hover:shadow-lg"
          >
            Okudum Anladım
          </button>
        </aside>
      ))}
    </div>
  );
}
