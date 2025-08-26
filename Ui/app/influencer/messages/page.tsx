'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getThread, getUnreadCount, markRead, sendMessage } from '@/lib/api';

type ThreadItem = {
  id: number;
  from_role: 'admin' | 'influencer';
  from_user_id: number;
  to_role: 'admin' | 'influencer';
  to_user_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function InfluencerMessagesPage() {
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const pollRef = useRef<any>(null);

  async function refreshUnread() {
    try {
      const r = await getUnreadCount();
      setUnread(r.unread);
    } catch {
      // sessiz geç
    }
  }

  async function loadThread() {
    setLoading(true);
    try {
      const res = await getThread(); // influencer: admin↔me
      setThread(res.items);
      // admin → me gelenleri okundu yap
      await markRead();
      await refreshUnread();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const body = composer.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage({ to: 'admin', body });
      setComposer('');
      await loadThread();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    // İlk yükleme ve 10sn polling
    (async () => {
      await loadThread();
    })();
    pollRef.current = setInterval(async () => {
      await loadThread();
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const list = useMemo(() => {
    if (loading) {
      return <div className="p-3 text-sm text-muted">Yükleniyor…</div>;
    }
    if (!thread.length) {
      return <div className="p-3 text-sm text-muted">Henüz mesaj yok. Admin ile iletişime geçmek için aşağıdan yazın.</div>;
    }
    return thread.map(m => {
      const isMine = m.from_role === 'influencer';
      return (
        <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] rounded px-3 py-2 text-sm border ${isMine ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-panel text-app border-app'}`}>
            <div>{m.body}</div>
            <div className="text-[10px] opacity-70 mt-1">
              {new Date(m.created_at).toLocaleString()} {isMine ? (m.read_at ? '✓✓' : '✓') : null}
            </div>
          </div>
        </div>
      );
    });
  }, [thread, loading]);

  return (
    <div className="max-w-3xl mx-auto border border-app rounded bg-panel h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-app flex items-center justify-between">
        <div>
          <div className="font-semibold">Admin ile Mesajlar</div>
          <div className="text-xs text-muted">Okunmamış: {unread}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {list}
      </div>
      <div className="border-t border-app p-3 flex gap-2">
        <textarea
          className="flex-1 rounded-md border border-app bg-transparent p-2 text-sm"
          placeholder="Mesaj yazın…"
          rows={2}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
        />
        <button
          onClick={handleSend}
          disabled={sending || !composer.trim()}
          className={`px-3 py-2 rounded-md border ${sending || !composer.trim() ? 'bg-gray-700 text-gray-300 cursor-not-allowed' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'} transition`}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}