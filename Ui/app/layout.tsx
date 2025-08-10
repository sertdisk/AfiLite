'use client'; // Client Component olarak işaretle

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // usePathname hook'unu import et
import '../styles/globals.css';

// Metadata artık burada tanımlanamaz, ayrı bir metadata.ts dosyasına taşınmalı veya layout.tsx'ten kaldırılmalı.
// Şimdilik kaldırıyorum, gerekirse sonra ekleyebiliriz.
// export const metadata: Metadata = {
//   title: 'AfiLite Admin',
//   description: 'AfiLite Admin Web UI — Next.js App Router + Tailwind'
// };

type NavItem = { label: string; href: string; match?: (path: string) => boolean };

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel', href: '/admin/dashboard', match: (p) => p === '/admin' || p.startsWith('/admin/dashboard') },
  { label: 'Influencerlar', href: '/admin/influencers', match: (p) => p.startsWith('/admin/influencers') },
  { label: 'Kodlar', href: '/admin/codes', match: (p) => p.startsWith('/admin/codes') },
  { label: 'Satışlar', href: '/admin/sales', match: (p) => p.startsWith('/admin/sales') },
  { label: 'Ödemeler', href: '/admin/payouts', match: (p) => p.startsWith('/admin/payouts') },
  { label: 'Komisyonlar', href: '/admin/commissions', match: (p) => p.startsWith('/admin/commissions') },
  { label: 'Ayarlar', href: '/admin/settings', match: (p) => p.startsWith('/admin/settings') },
  { label: 'Çıkış', href: '/admin/logout', match: (p) => p.startsWith('/admin/logout') },
];

function cls(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(' ');
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''; // usePathname hook'unu kullan ve null kontrolü ekle

  const isAuthOrInfluencerPath = pathname.startsWith('/influencer') || pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/admin/login');

  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-app text-app">
        {!isAuthOrInfluencerPath && (
          <header className="border-b bg-[#0a0e16]">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-4">
                  {/* Başlık linki statik */}
                  <span className="font-semibold text-lg text-gray-900 select-none pointer-events-none">AfiLite Yönetim</span>
                  {/* Yalnızca admin menüsü — influencer menüsünü gizle */}
                  <nav className="hidden md:flex items-center gap-1" aria-label="Admin primary menu">
                      {NAV_ITEMS.map((item) => {
                        const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={cls(
                              'px-3 py-2 rounded-md text-sm transition-colors',
                              active ? 'bg-[#0f172a] text-white' : 'text-[#e6e8ee] hover:bg-[#0f172a] hover:text-white'
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                </div>
                <nav className="flex md:hidden gap-2 overflow-x-auto no-scrollbar">
                  {NAV_ITEMS.map((item) => {
                    const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        className={cls(
                          'px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors',
                          active ? 'bg-[#0f172a] text-white' : 'text-[#e6e8ee] hover:bg-[#0f172a] hover:text-white'
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </header>
        )}

        <main role="main" className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
        {/* styled-jsx kaldırıldı; Server Component uyumluluğu için Tailwind sınıfları ve global CSS kullanılacak */}
      </body>
    </html>
  );
}