'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getMyThread, getUnreadCount, markRead, sendMessage, getInfluencerMe } from '@/lib/api';

export default function InfluencerMessagesPage() {
  const [thread, setThread] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const pollRef = useRef<any>(null);

  async function refreshUnread() {
    try {
      const r = await getUnreadCount();
      setUnread(r.unread);
    } catch (error) { console.error(error);
      // sessiz geç
    }
  }

  async function loadThread() {
    setLoading(true);
    try {
      const res = await getMyThread(); // influencer: admin↔me
      setThread(res.items);
      // admin → me gelenleri okundu yap
      try {
        await markRead({ influencerId: res.items[0].to_user_id });
      } catch (e) {
        // Okunmamış mesaj sayısı için gerekli değil, yutulabilir
        console.warn('Mesaj okundu olarak işaretlenemedi:', e);
      }
      await refreshUnread();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!composer.trim()) return;
    setSending(true);
    try {
      // Influencer kendi mesajını gönderiyor, backend artık bunu destekliyor
      await sendMessage(null, composer); // to ve influencerId backend tarafından belirleniyor
      setComposer('');
      await loadThread(); // Yeni mesajı yükle
    } catch (e) {
      console.error('Mesaj gönderilemedi:', e);
      alert('Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadThread();
  }, []);

  if (loading) {
    return <div className="p-4">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-6 mb-8 transition-all duration-300 hover:shadow-purple-500/10">
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {thread.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-xl transition-all duration-200 ${
                  msg.from_role === 'admin'
                    ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-l-4 border-blue-500'
                    : 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 border-l-4 border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-purple-300">
                    {msg.from_role === 'admin' ? 'Admin' : 'Influencer'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
                <p className="mt-2 text-gray-200">{msg.body}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-6 transition-all duration-300 hover:shadow-purple-500/10">
          <div className="mb-4">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className="w-full p-4 rounded-xl border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-900/50 transition-all duration-200 resize-none bg-gray-900/50 text-white"
              rows={3}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gönderiliyor...
              </span>
            ) : 'Mesaj Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}