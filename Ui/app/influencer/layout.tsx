'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // usePathname import edildi
import { getUnreadCount } from '@/lib/api';

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<number>(0);
  const pollRef = useRef<any>(null);
  const pathname = usePathname() || ''; // pathname alındı

  async function refresh() {
    try {
      const r = await getUnreadCount();
      setUnread(r.unread);
    } catch {
      // sessiz geç
    }
  }

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isApplyPage = pathname === '/influencer/apply'; // /influencer/apply sayfası kontrolü

  return (
    <div className="min-h-screen">
      {!isApplyPage && ( // Eğer başvuru sayfası değilse menüyü göster
        <nav className="sticky top-0 z-10 border-b border-app bg-panel/80 backdrop-blur px-4 py-3 flex items-center gap-4">
          <Link href="/influencer/dashboard" className="text-sm hover:underline">Dashboard</Link>
          <Link href="/influencer/profile" className="text-sm hover:underline">Profil</Link>
          <Link href="/influencer/balance" className="text-sm hover:underline">Ödemeler</Link> {/* Yeni eklendi */}
          <Link href="/influencer/messages" className="relative text-sm hover:underline">
            Mesajlar
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] rounded-full bg-red-600 text-white">
                {unread}
              </span>
            )}
          </Link>
        </nav>
      )}
      <main className="p-4">
        {children}
      </main>
    </div>
  );
}