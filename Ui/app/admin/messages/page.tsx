'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getThread, getUnreadCount, markRead, searchInfluencers, sendMessage } from '@/lib/api';

type InfluencerHit = { id: number; name: string; email: string; social_handle: string; status: string; codes: string[] };

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

export default function AdminMessagesPage() {
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [results, setResults] = useState<InfluencerHit[]>([]);
  const [selected, setSelected] = useState<InfluencerHit | null>(null);

  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);

  const pollRef = useRef<any>(null);

  async function doSearch() {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await searchInfluencers(query.trim());
      setResults(res.items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadThread(influencerId: number) {
    setThreadLoading(true);
    try {
      const res = await getThread({ influencerId, limit: 100 });
      setThread(res.items);
      // Bu konuşmadaki unread'leri okundu yap
      await markRead({ influencerId });
      // Toplam unread badge'i refresh
      refreshUnread();
    } catch (e: any) {
      console.error(e);
    } finally {
      setThreadLoading(false);
    }
  }

  async function refreshUnread() {
    try {
      const r = await getUnreadCount({ aggregate: true });
      setUnreadTotal(r.unread);
    } catch (e) {
      // sessiz geç
    }
  }

  useEffect(() => {
    // 10sn polling ile hem unread hem seçili thread'i tazele
    pollRef.current = setInterval(async () => {
      await refreshUnread();
      if (selected) await loadThread(selected.id);
    }, 10000);
    (async () => {
      await refreshUnread();
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected?.id]);

  async function handleSend() {
    if (!selected) return;
    const body = composer.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage({ to: 'influencer', influencerId: selected.id, body });
      setComposer('');
      await loadThread(selected.id);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const rightPane = useMemo(() => {
    if (!selected) {
      return (
        <div className="h-full flex items-center justify-center text-sm text-muted border-l border-app">
          Sol listeden bir influencer seçin
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-app">
          <div className="font-semibold">{selected.name}</div>
          <div className="text-xs text-muted">{selected.email} · @{selected.social_handle} · Kodlar: {selected.codes?.join(', ') || '—'}</div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {threadLoading ? (
            <div className="text-sm text-muted">Yükleniyor…</div>
          ) : (
            thread.map((m) => {
              const isAdmin = m.from_role === 'admin';
              return (
                <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded px-3 py-2 text-sm border ${isAdmin ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-panel text-app border-app'}`}>
                    <div>{m.body}</div>
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleString()} {isAdmin ? (m.read_at ? '✓✓' : '✓') : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
  }, [selected, thread, threadLoading, composer, sending]);

  return (
    <div className="h-[calc(100vh-80px)] grid grid-cols-1 md:grid-cols-3 gap-0 border border-app rounded bg-panel overflow-hidden">
      <div className="md:col-span-1 flex flex-col">
        <div className="p-3 border-b border-app flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
            placeholder="İndirim kodu, hesap adı veya ad/soyad ara…"
            className="w-full rounded-md border border-app bg-transparent p-2 text-sm"
          />
          <button
            onClick={doSearch}
            className="px-3 py-2 rounded-md border border-app bg-white/5 hover:bg-white/10 text-sm"
          >
            Ara
          </button>
        </div>
        <div className="p-2 text-xs text-muted">Toplam okunmamış: {unreadTotal}</div>
        <div className="flex-1 overflow-auto">
          {loadingSearch ? (
            <div className="p-3 text-sm text-muted">Aranıyor…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted">Sonuç yok</div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={async () => { setSelected(r); await loadThread(r.id); }}
                className={`w-full text-left p-3 border-b border-app hover:bg-white/5 ${selected?.id === r.id ? 'bg-white/10' : ''}`}
              >
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted">@{r.social_handle} · {r.email}</div>
                <div className="text-[10px] text-muted mt-1">Kodlar: {r.codes?.join(', ') || '—'}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="md:col-span-2 min-h-0">{rightPane}</div>
    </div>
  );
}