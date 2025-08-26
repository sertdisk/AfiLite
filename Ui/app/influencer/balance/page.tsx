'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getMyBalance, getMySales, getMySettlements } from '@/lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type SaleItem = {
  id: number;
  date: string;
  code: string;
  customer: string;
  package_name: string;
  package_amount: number;
  commission_amount: number;
};

type SettlementItem = {
  id: number;
  date: string;
  method: string;
  account: string;
  amount: number;
  note?: string;
  bank_name?: string; // Yeni eklendi
  account_owner?: string; // Yeni eklendi
  balance_before_settlement?: number; // Yeni eklendi
  balance_after_settlement?: number; // Yeni eklendi
};

export default function InfluencerBalancePage() {
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const [balance, setBalance] = useState<{ total_balance: number; currency?: string } | null>(null);
  const [sales, setSales] = useState<SaleItem[]>([]); // Bu sayfada kullanılmasa da API'den geliyor
  const [totalCommission, setTotalCommission] = useState<number>(0); // Bu sayfada kullanılmasa da API'den geliyor
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);

  // Sayfalama ve Arama State'leri
  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalSettlementsCount, setTotalSettlementsCount] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        // Toplam bakiye
        const b = await getMyBalance();
        setBalance(b);

        // Ödeme/mahsuplaşma geçmişi (sayfalama ve arama ile)
        const st = await getMySettlements({
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          query: searchQuery
        });
        setSettlements(st.items || []);
        setTotalSettlementsCount(st.total_count ?? 0);

        // Toplam ödeme miktarını hesapla
        // Not: API'den total_paid_amount gelmiyorsa, tüm ödemeleri çekip burada toplamalıyız.
        // Şimdilik sadece mevcut sayfadaki ödemelerin toplamını alıyoruz, bu doğru değil.
        // Backend'den toplam ödeme miktarı gelmeli veya tüm ödemeler çekilip toplanmalı.
        const allSettlementsForTotal = await getMySettlements(); // Tüm ödemeleri çek
        const calculatedTotalPaid = allSettlementsForTotal.items.reduce((sum, item) => sum + item.amount, 0);
        setTotalPaidAmount(calculatedTotalPaid);

      } catch (e: any) {
        setServerError(e?.message || 'Muhasebe verileri alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, itemsPerPage, searchQuery]);

  // Kazanç trend grafiği (ödeme geçmişi verileriyle)
  const earningsTrend = useMemo(() => {
    // Ödemeleri tarihe göre sırala
    const sortedSettlements = [...settlements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const labels = sortedSettlements.map((s) => new Date(s.date).toLocaleDateString());
    const data = sortedSettlements.map((s) => s.amount); // Ödeme miktarları

    return {
      labels,
      datasets: [
        {
          label: 'Alınan Ödeme Miktarı',
          data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.35,
          fill: true,
        }
      ]
    };
  }, [settlements]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8" id="balance-page-header">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Ödemelerim
          </h1>
          <p className="text-lg text-gray-400">
            Toplam kazançlarınızı, ödeme geçmişinizi ve performans trendlerinizi takip edin.
          </p>
        </header>

        {serverError && (
          <div role="alert" className="text-sm bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 shadow-md">{serverError}</div>
        )}

        {/* Toplam Ödeme Miktarı */}
        <section id="total-paid-amount-section" className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 text-center">
          <h2 className="text-xl font-bold text-gray-100 mb-2">Bugüne Kadar Alınan Toplam Ödeme</h2>
          <p className="text-5xl font-extrabold text-blue-400">
            {loading ? 'Yükleniyor…' : `${totalPaidAmount.toFixed(2)} ${balance?.currency ?? 'TL'}`}
          </p>
        </section>

        {/* Ödeme/Mahsuplaşma Geçmişi */}
        <section id="settlement-history-section" className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 space-y-6">
          <h2 className="text-xl font-bold text-gray-100">Ödeme Geçmişi</h2>
          
          {/* Arama Kutusu */}
          <div className="flex justify-end">
            <input
              type="text"
              placeholder="Ödeme ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
            />
          </div>

          <div className="overflow-x-auto bg-gray-700 rounded-lg shadow-md">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700 border-b border-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Tarih</th>
                  <th scope="col" className="px-4 py-3">Hesap/IBAN</th>
                  <th scope="col" className="px-4 py-3">Banka</th>
                  <th scope="col" className="px-4 py-3">Hesap Sahibi</th>
                  <th scope="col" className="px-4 py-3">Önceki Bakiye</th>
                  <th scope="col" className="px-4 py-3">Ödeme Miktarı</th>
                  <th scope="col" className="px-4 py-3">Sonraki Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400">Kayıt bulunamadı</td>
                  </tr>
                ) : settlements.map((st) => {
                  // Mock bakiye hesaplamaları (gerçek veriler backend'den gelmeli)
                  const mockBalanceBefore = (balance?.total_balance ?? 0) + st.amount;
                  const mockBalanceAfter = balance?.total_balance ?? 0;

                  return (
                    <tr key={st.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-3">{new Date(st.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{st.account}</td>
                      <td className="px-4 py-3">{st.bank_name ?? 'Bilgi Yok'}</td>
                      <td className="px-4 py-3">{st.account_owner ?? 'Bilgi Yok'}</td>
                      <td className="px-4 py-3">{st.balance_before_settlement?.toFixed(2) ?? mockBalanceBefore.toFixed(2)} TL</td>
                      <td className="px-4 py-3">{st.amount.toFixed(2)} TL</td>
                      <td className="px-4 py-3">{st.balance_after_settlement?.toFixed(2) ?? mockBalanceAfter.toFixed(2)} TL</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama Kontrolleri */}
          {totalSettlementsCount > itemsPerPage && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                &larr; Önceki
              </button>
              <span className="text-gray-300">
                Sayfa {currentPage} / {Math.ceil(totalSettlementsCount / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(totalSettlementsCount / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(totalSettlementsCount / itemsPerPage)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Sonraki &rarr;
              </button>
            </div>
          )}
        </section>

        {/* Kazanç Performansı Grafiği */}
        <section id="earnings-performance-chart" className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 space-y-6">
          <h2 className="text-xl font-bold text-gray-100">Kazanç Performansı</h2>
          <p className="text-sm text-gray-400">Alınan ödeme miktarlarının zaman içindeki trendi.</p>
          <div className="bg-gray-700 p-5 rounded-lg shadow-inner">
            <Line data={earningsTrend} />
          </div>
        </section>
      </div>
    </main>
  );
}