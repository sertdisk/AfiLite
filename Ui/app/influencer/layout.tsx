'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUnreadCount } from '@/lib/api';

interface MenuItem {
  id: string;
  href: string;
  label: string;
  icon: JSX.Element;
  external?: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
}

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<number>(0);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false); // Menü genişletme durumu
  const pollRef = useRef<any>(null);
  const pathname = usePathname() || '';
  
  // Menü öğeleri istenen sırayla - alt öğeler kaldırıldı
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      href: '/influencer/dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'payments',
      href: '/influencer/balance',
      label: 'Ödemeler',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'messages',
      href: '/influencer/messages',
      label: 'Mesajlar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      hasUnread: unread > 0,
      unreadCount: unread,
    },
    {
      id: 'profile',
      href: '/influencer/profile',
      label: 'Profil',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'logout',
      href: '/logout',
      label: 'Çıkış Yap',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
    },
    {
      id: 'contract',
      href: '/docs/API_DOKUMANTASYON.md',
      label: 'Güncel Sözleşme',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      external: true,
    }
  ];

  async function refresh() {
    try {
      const r = await getUnreadCount();
      setUnread(r.unread);
      setIsAuthenticated(true); // API çağrısı başarılıysa kimlik doğrulandı
    } catch (error) {
      setUnread(0); // Hata durumunda okunmamış mesaj sayısını sıfırla
      setIsAuthenticated(false); // API çağrısı başarısızsa kimlik doğrulanmadı
      // console.error("Failed to fetch unread count:", error); // Hata logu, isteğe bağlı
    }
  }

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isApplyPage = pathname === '/influencer/apply';

  // Menüyü sadece kullanıcı login olduğunda göster
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        await getUnreadCount(); // Kimlik doğrulaması gerektiren bir API çağrısı
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        // console.error("Authentication check failed:", error); // Hata durumunda log
      }
    }
    
    checkAuthStatus();
  }, []);

  if (isApplyPage || !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <main className="p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobil menü overlay */}
      {isMenuExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMenuExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-full bg-gray-900 text-white z-50
        transform transition-all duration-300 ease-in-out
        ${isMenuExpanded ? 'w-64' : 'w-16'}
        lg:translate-x-0 lg:static
        shadow-xl
      `}>
        <div className="flex flex-col h-full">
          {/* Logo / Başlık */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h1 className={`text-xl font-bold ${isMenuExpanded ? 'inline-block' : 'hidden'}`}>Influencer Panel</h1>
            <button
              onClick={() => setIsMenuExpanded(!isMenuExpanded)}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              {isMenuExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Menü öğeleri */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${pathname === item.href
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-gray-800 text-gray-300'
                        }
                      `}
                    >
                      <span className="mr-3 text-gray-400">{item.icon}</span>
                      <span className={`${isMenuExpanded ? 'inline-block' : 'hidden'}`}>{item.label}</span>
                      {item.hasUnread && isMenuExpanded && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] rounded-full bg-red-600 text-white">
                          {item.unreadCount}
                        </span>
                      )}
                      {item.external && isMenuExpanded && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${pathname === item.href
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-gray-800 text-gray-300'
                        }
                      `}
                      onClick={() => setIsMenuExpanded(false)}
                    >
                      <span className="mr-3 text-gray-400">{item.icon}</span>
                      <span className={`${isMenuExpanded ? 'inline-block' : 'hidden'}`}>{item.label}</span>
                      {item.hasUnread && isMenuExpanded && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] rounded-full bg-red-600 text-white">
                          {item.unreadCount}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Ana içerik */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobil menü toggle butonu */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 p-4 lg:hidden">
          <button
            onClick={() => setIsMenuExpanded(!isMenuExpanded)}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* İçerik */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}