/* Kısa açıklama: Uygulama kök yerleşimi — Tailwind global stilleri ve temel HTML iskeleti. */
import type { Metadata } from 'next';
import React from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'AfiLite Admin',
  description: 'AfiLite Admin Web UI — Next.js App Router + Tailwind'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-app text-app">
        <main role="main" className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}