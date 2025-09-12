'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';
import {
  ApiError,
  searchInfluencers,
  listAlerts,
  createAlert,
  getAdminMessageThreadsSummary,
  getThread,
  sendAdminMessage,
  postAdminBulkMessage,
  markRead,
} from '@/lib/api';

// Tipler (Interfaces)
interface Influencer { id: number; name: string; email: string; brand_name?: string; }
interface Alert { id: number; message: string; created_at: string; target_influencer_ids?: string; }
interface Message { id: number; from_user_id: number; body: string; created_at: string; from_role: string; }
interface ThreadSummary { influencerId: number; influencerName: string; lastMessage: string | null; lastMessageAt: string | null; isAdminSender: boolean; unreadCount: number; }

// #region Helper Components

function InfluencerSelector({ onSelectionChange, selectionMode = 'multiple' }: { onSelectionChange: (ids: number[] | null) => void, selectionMode?: 'single' | 'multiple' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Influencer[]>([]);
  const [selectedInfluencers, setSelectedInfluencers] = useState<Influencer[]>([]);
  const [sendToAll, setSendToAll] = useState(true);

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
        setSearchResults(results.filter(r => !selectedInfluencers.some(t => t.id === r.id)));
      } catch (error) {
        console.error('Arama hatası:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [selectedInfluencers]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    if (selectionMode === 'multiple') {
        onSelectionChange(sendToAll ? null : selectedInfluencers.map(i => i.id));
    } else {
        onSelectionChange(selectedInfluencers.length > 0 ? selectedInfluencers.map(i => i.id) : null);
    }
  }, [selectedInfluencers, sendToAll, onSelectionChange, selectionMode]);

  const handleSelect = (influencer: Influencer) => {
    if (selectionMode === 'single') {
        setSelectedInfluencers([influencer]);
    } else {
        if (!selectedInfluencers.some(i => i.id === influencer.id)) {
            setSelectedInfluencers([...selectedInfluencers, influencer]);
        }
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemove = (id: number) => {
    setSelectedInfluencers(selectedInfluencers.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-md border border-gray-700">
      {selectionMode === 'multiple' && (
        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={sendToAll} onChange={e => setSendToAll(e.target.checked)} className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-600" />
          Tüm Influencer'lara Gönder
        </label>
      )}
      
      {!sendToAll && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Influencer ara (isim, e-posta veya marka adı)..."
            className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400"
          />
          {isSearching && <p className="absolute right-3 top-2.5 text-sm text-gray-400">Aranıyor...</p>}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((inf) => (
                <div key={inf.id} onClick={() => handleSelect(inf)} className="px-4 py-2 hover:bg-gray-600 cursor-pointer">
                  <p className="font-semibold">{inf.name}</p>
                  <p className="text-sm text-gray-400">{inf.email}</p>
                  {inf.brand_name && <p className="text-xs text-gray-500">Marka: {inf.brand_name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!sendToAll && selectedInfluencers.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
          {selectedInfluencers.map(inf => (
            <div key={inf.id} className="flex items-center bg-purple-600/50 text-white text-sm rounded-full px-3 py-1">
              <span>{inf.name}</span>
              <button onClick={() => handleRemove(inf.id)} className="ml-2 text-lg font-bold">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorDisplay({ message }: { message: string | null }) {
    if (!message) return null;
    return <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 my-4">{message}</div>;
}

// #endregion

// #region Tab Components

function AnnouncementsTab() {
  const [message, setMessage] = useState('');
  const [targetIds, setTargetIds] = useState<number[] | null>(null); // null for all
  const [pastAlerts, setPastAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAlerts({ page, limit });
      setPastAlerts(data.items || []);
      setTotal(data.pagination?.total || 0);
    } catch (e: any) { console.error(e); setError('Geçmiş duyurular yüklenemedi.'); }
    finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { setError('Mesaj boş olamaz.'); return; }
    if (targetIds !== null && targetIds.length === 0) { setError('Lütfen en az bir influencer seçin veya tümünü seçin.'); return; }

    setLoading(true);
    setError(null);
    try {
      await createAlert({ message, target_influencer_ids: targetIds === null ? undefined : targetIds });
      setMessage('');
      fetchAlerts();
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Yeni Duyuru Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InfluencerSelector onSelectionChange={setTargetIds} />
        <div>
          <label htmlFor="announcement-message" className="block text-sm font-medium mb-1 text-gray-300">Duyuru Mesajı</label>
          <textarea id="announcement-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400" placeholder="Duyuru metnini buraya girin..." />
        </div>
        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 transition-colors">
          {loading ? 'Gönderiliyor...' : 'Duyuruyu Gönder'}
        </button>
        <ErrorDisplay message={error} />
      </form>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white">Geçmiş Duyurular</h2>
        <div className="space-y-3 mt-4">
          {pastAlerts.length > 0 ? (
            pastAlerts.map(alert => (
              <div key={alert.id} className="p-4 border rounded-lg bg-gray-800/50 border-gray-700">
                <p className="text-gray-200">{alert.message}</p>
                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>Tarih: {new Date(alert.created_at).toLocaleString('tr-TR')}</span>
                    <span>Hedef: {alert.target_influencer_ids ? `${JSON.parse(alert.target_influencer_ids).length} influencer` : 'Tümü'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Henüz gönderilmiş bir duyuru yok.</p>
          )}
        </div>
        {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm text-white">
                <div>Toplam {total} duyuru</div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border px-3 py-1 disabled:opacity-50">Önceki</button>
                    <span>Sayfa {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border px-3 py-1 disabled:opacity-50">Sonraki</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
    const [view, setView] = useState('threads'); // 'threads' or 'bulk'
    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('unread');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [total, setTotal] = useState(0);
    
    const [activeConvo, setActiveConvo] = useState<{id: number, name: string} | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagePage, setMessagePage] = useState(1);
    const [messageLimit, setMessageLimit] = useState(20);
    const [messageTotal, setMessageTotal] = useState(0);

    const [bulkMessage, setBulkMessage] = useState('');
    const [bulkTargetIds, setBulkTargetIds] = useState<number[] | null>(null);
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    const [replyMessage, setReplyMessage] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    const fetchThreads = useCallback(async () => {
        setLoadingThreads(true);
        try {
            const data = await getAdminMessageThreadsSummary({ filter: filter as any, page, limit });
            setThreads(data.items || []);
            setTotal(data.pagination?.total || 0);
        } catch (e: any) { setError(e.message || 'Konuşmalar yüklenemedi.'); }
        finally { setLoadingThreads(false); }
    }, [filter, page, limit]);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);

    const openConversation = async (id: number, name: string, resetPage = true) => {
        if (resetPage) setMessagePage(1);
        setActiveConvo({id, name});
        setLoadingMessages(true);
        try {
            const data = await getThread({ influencerId: id, page: resetPage ? 1 : messagePage, limit: messageLimit });
            setMessages(prev => resetPage ? (data.items || []) : [...(data.items || []), ...prev]);
            setMessageTotal(data.pagination?.total || 0);
            await markRead({ influencerId: id });
            fetchThreads(); // Refresh unread counts
        } catch (e: any) { setError(e.message || 'Mesajlar yüklenemedi.'); }
        finally { setLoadingMessages(false); }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !activeConvo) return;
        setIsSendingReply(true);
        try {
            const { item } = await sendAdminMessage(activeConvo.id, replyMessage);
            setMessages(prev => [...prev, item]);
            setReplyMessage('');
            fetchThreads(); // Refresh last message
        } catch (e: any) { setError(e.message || 'Mesaj gönderilemedi.'); }
        finally { setIsSendingReply(false); }
    };

    const handleSendBulk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkMessage.trim()) { setError('Mesaj boş olamaz.'); return; }
        if (bulkTargetIds !== null && bulkTargetIds.length === 0) { setError('Lütfen en az bir influencer seçin veya tümünü seçin.'); return; }
        
        setIsSendingBulk(true);
        setError(null);
        try {
            await postAdminBulkMessage({ body: bulkMessage, influencerIds: bulkTargetIds === null ? [] : bulkTargetIds });
            setBulkMessage('');
            alert('Toplu mesaj gönderildi.');
        } catch (e: any) { setError(e.message || 'Toplu mesaj gönderilemedi.'); }
        finally { setIsSendingBulk(false); }
    };

    const totalPages = Math.ceil(total / limit);
    const messageTotalPages = Math.ceil(messageTotal / messageLimit);

    if (activeConvo) {
        return (
            <div>
                <button onClick={() => setActiveConvo(null)} className="mb-4 px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 transition-colors text-white">← Geri</button>
                <h2 className="text-xl font-bold mb-4">{activeConvo.name} ile Mesajlaşma</h2>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto p-4 border rounded-md bg-gray-900/30 border-gray-700 mb-4">
                    {loadingMessages ? <p>Yükleniyor...</p> :
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.from_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-lg ${msg.from_role === 'admin' ? 'bg-purple-600' : 'bg-gray-700'}`}>
                                    <p>{msg.body}</p>
                                    <p className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                </div>
                {messagePage < messageTotalPages && (
                    <div className="text-center mt-2">
                        <button onClick={() => {
                            setMessagePage(prev => prev + 1);
                            openConversation(activeConvo.id, activeConvo.name, false);
                        }} disabled={loadingMessages} className="px-4 py-2 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 transition-colors text-white">
                            {loadingMessages ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendReply} className="space-y-3">
                    <textarea value={replyMessage} onChange={e => setReplyMessage(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white" placeholder="Cevabınızı yazın..." />
                    <button type="submit" disabled={isSendingReply} className="px-6 py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600">{isSendingReply ? '...' : 'Gönder'}</button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Özel Mesajlar</h2>
                <button onClick={() => setView(v => v === 'threads' ? 'bulk' : 'threads')} className="px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 transition-colors text-white">
                    {view === 'threads' ? 'Toplu Mesaj Gönder' : 'Görüşmelere Dön'}
                </button>
            </div>

            <ErrorDisplay message={error} />

            {view === 'bulk' ? (
                <form onSubmit={handleSendBulk} className="space-y-4">
                    <h3 className="text-xl font-semibold">Toplu Mesaj</h3>
                    <InfluencerSelector onSelectionChange={setBulkTargetIds} />
                    <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white" placeholder="Tüm veya seçili influencerlara gönderilecek mesaj..." />
                    <button type="submit" disabled={isSendingBulk} className="px-6 py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600">{isSendingBulk ? 'Gönderiliyor...' : 'Toplu Mesajı Gönder'}</button>
                </form>
            ) : (
                <div>
                    <div className="flex border-b border-gray-700 mb-2">
                        {['unread', 'all', 'sent', 'incoming'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`py-2 px-4 text-sm font-medium capitalize ${filter === f ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>{f === 'unread' ? 'Okunmamış' : f === 'all' ? 'Tümü' : f === 'sent' ? 'Giden' : 'Gelen'}</button>
                        ))}
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {loadingThreads ? <p>Yükleniyor...</p> :
                            threads.map(thread => (
                                <div key={thread.influencerId} onClick={() => openConversation(thread.influencerId, thread.influencerName)} className="p-3 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{thread.influencerName}</p>
                                        {thread.unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{thread.unreadCount}</span>}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{thread.isAdminSender && 'Siz: '}{thread.lastMessage}</p>
                                </div>
                            ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4 text-sm text-white">
                            <div>Toplam {total} konuşma</div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border px-3 py-1 disabled:opacity-50">Önceki</button>
                                <span>Sayfa {page} / {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border px-3 py-1 disabled:opacity-50">Sonraki</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// #endregion

// Main Page Component
export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState('messages');

  return (
    <main className="space-y-6 p-4 md:p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold">Mesajlar ve Duyurular</h1>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('messages')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'messages' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            Özel Mesajlar
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'announcements' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            Duyurular
          </button>
        </nav>
      </div>

      <div className="pt-6">
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
      </div>
    </main>
  );
}
