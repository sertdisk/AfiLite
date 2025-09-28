'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getInfluencerSummary,
  createMyDiscountCode,
  getMyBalance,
  getMySettlements,
  getMySales,
  listMyCodesUnsafe,
  getInfluencerDashboardStats
} from '@/lib/api';
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

type MyCode = {
  id: number;
  code: string;
  discount_pct: number;
  commission_pct: number;
  is_active: number | boolean;
  created_at?: string;
  approved_at?: string; // Yeni eklendi
};

export default function InfluencerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ status: string; created_at: string; days_since_application: number } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Kodlar bölümü durumu
  const [codes, setCodes] = useState<MyCode[]>([]);
  const [createBusy, setCreateBusy] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [newCodeInput, setNewCodeInput] = useState(''); // Yeni kod oluşturma input değeri

  // Performans bölümü durumu
  const [balance, setBalance] = useState<number | null>(null);
  const [latestSettlement, setLatestSettlement] = useState<any | null>(null);
  const [latestSales, setLatestSales] = useState<any[]>([]);
  const [itemsPerPage] = useState(5); // Her sayfada gösterilecek öğe sayısı
  const [currentPage, setCurrentPage] = useState(1); // Mevcut sayfa
  const [totalSalesCount, setTotalSalesCount] = useState(0); // Toplam satış sayısı
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const s = await getInfluencerSummary();
        if (!isMounted) return;
        setSummary(s);

        // Influencer'ın kodlarını çek
        try {
          const myCodes = await listMyCodesUnsafe();
          if (!isMounted) return;
          setCodes(myCodes.items || []);
        } catch (e: any) {
          console.error('Kodlar alınamadı:', e);
        }

        // Bakiye ve performans verilerini çek
        const b = await getMyBalance();
        if (!isMounted) return;
        setBalance(b?.total_balance ?? 0);

        const settlements = await getMySettlements();
        if (!isMounted) return;
        if (settlements?.items && settlements.items.length > 0) {
          setLatestSettlement(settlements.items[0]); // En son ödeme
        }
        
        const dashboardStats = await getInfluencerDashboardStats();
        if (!isMounted) return;
        setStats(dashboardStats);

      } catch (e: any) {
        if (!isMounted) return;
        setServerError(e?.message || 'Veriler alınamadı: ' + e?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, []); // Sadece bileşen mount olduğunda çalış

  // Kodlar veya sayfa değiştiğinde satış verilerini güncelle
  useEffect(() => {
    if (codes.length === 0 || !codes[0].code) return;

    (async () => {
      try {
        const sales = await getMySales({
          code: codes[0].code,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage
        });
        setLatestSales(sales?.items || []);
        setTotalSalesCount(sales?.pagination?.total ?? 0);
      } catch (e: any) {
        console.error('Satış verileri alınamadı:', e);
      }
    })();
  }, [codes, currentPage, itemsPerPage]);

  async function handleCreateCode() {
    if (!newCodeInput) {
      setCodeMessage('Lütfen bir kod girin.');
      return;
    }
    if (newCodeInput.length < 5 || newCodeInput.length > 10) {
      setCodeMessage('Kod uzunluğu 5 ile 10 karakter arasında olmalıdır.');
      return;
    }

    try {
      setCreateBusy(true);
      setCodeMessage(null);
      const res = await createMyDiscountCode({ code: newCodeInput.toUpperCase() }); // Kodu büyük harfe çevir
      const newCode: MyCode = {
        id: res.code_id,
        code: res.code.code,
        discount_pct: res.code.discount_pct,
        commission_pct: res.code.commission_pct,
        is_active: res.code.is_active,
        created_at: res.code.created_at,
        approved_at: res.code.approved_at // API'den geliyorsa
      };
      setCodes((prev) => [...prev, newCode]);
      setNewCodeInput(''); // Inputu temizle
      // Admin onayı bekleniyorsa kullanıcıyı bilgilendir
      if (newCode.is_active === false || Number(newCode.is_active) === 0) {
        setCodeMessage('Kodunuz oluşturuldu. Admin onayı sonrası aktif olacaktır.');
      } else {
        setCodeMessage('Kodunuz oluşturuldu ve aktif.');
      }
    } catch (e: any) {
      setCodeMessage(e?.message || 'Kod oluşturulamadı');
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8 bg-gray-800/50 backdrop-blur-xl border border-white/5 rounded-xl p-6" id="dashboard-header">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Influencer Panosu
          </h1>
          <p className="text-lg text-gray-400">Genel durumunuzu ve temel performans özetini tek bakışta görün.</p>
        </header>


        {serverError && (
          <div role="alert" className="text-sm bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 shadow-md">{serverError}</div>
        )}

        <section id="code-management-section" className="p-6 bg-gray-800/50 backdrop-blur-xl border border-white/5 rounded-xl shadow-lg space-y-6">
          {codeMessage && <div className="text-sm bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 text-emerald-400 shadow-md">{codeMessage}</div>}

          {codes.length === 0 ? (
            <div className="space-y-4">
              <div className="p-8 border border-dashed border-gray-600 rounded-xl text-center space-y-5 bg-gray-800/50 backdrop-blur-xl border-white/5">
                <p className="text-xl font-bold text-gray-200">Henüz bir kodunuz görünmüyor.</p>
                <p className="text-base text-gray-200 leading-relaxed">
                  Hızlı kod oluşturma alanını kullanarak ilk kodunuzu oluşturun. Oluşturduğunuz kod aktif hale geldiğinde, bu kod aracılığıyla yapılan her satışta, müşteriniz indirim kazanırken siz de tanımlanan oran üzerinden komisyon elde edeceksiniz. Komisyon oranlarını, kod aktif olduğunda sistem üzerinden görüntüleyebilirsiniz.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateCode(); }} id="create-code-form" className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-6">
                  <input
                    type="text"
                    placeholder="5-10 karakterli kod"
                    value={newCodeInput}
                    onChange={(e) => setNewCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={10}
                    minLength={5}
                    className="flex-grow max-w-xs px-5 py-2.5 rounded-lg border border-white/5 bg-gray-800/50 backdrop-blur-xl text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200 text-lg"
                  />
                  <button
                    type="submit"
                    disabled={createBusy || newCodeInput.length < 5 || newCodeInput.length > 10}
                    className={`px-6 py-2.5 rounded-lg font-bold text-lg ${createBusy || newCodeInput.length < 5 || newCodeInput.length > 10 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r from-cyan-500 to-violet-500`}
                  >
                    {createBusy ? 'Oluşturuluyor…' : 'Kod Oluştur'}
                  </button>
                </form>
                <p className="text-sm text-gray-500 mt-3">5 ile 10 karakter uzunluğunda indirim kodu oluşturabilirsin, harf ve rakam kullanılabilir, harfler otomatik olarak büyük olur.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {codes.map((c) => {
                const isActive = !(c.is_active === false || Number(c.is_active) === 0);
                return (
                  <article key={c.id} id={`code-card-${c.id}`} className="p-6 border border-white/5 rounded-xl bg-gray-800/50 backdrop-blur-xl shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                      <div className="mb-2 sm:mb-0">
                        <h3 className="text-3xl font-bold text-cyan-400">KOD: {c.code}</h3>
                        <p className="text-sm text-gray-200 mt-1">
                          Oluşturulma Tarihi: {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                          {isActive ? (
                            <>
                              {' '}· Onay Tarihi: {c.approved_at ? new Date(c.approved_at).toLocaleDateString() : '—'}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${isActive ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                        {isActive ? 'Aktif' : 'Onay için bekliyor'}
                      </span>
                    </div>

                    {isActive ? (
                      <div className="text-base text-gray-200 mb-4 space-y-1">
                        <p>İndirim Oranı: <span className="font-bold text-white">%{c.discount_pct}</span></p>
                        <p>Komisyon Oranı: <span className="font-bold text-white">%{c.commission_pct}</span></p>
                      </div>
                    ) : (
                      <p className="text-base text-gray-200 mt-2 leading-relaxed">
                        Oluşturduğunuz kod aktif hale geldiğinde, bu kod aracılığıyla yapılan her satışta, müşteriniz indirim kazanırken siz de tanımlanan oran üzerinden komisyon elde edeceksiniz. Komisyon oranlarını, kod aktif olduğunda sistem üzerinden görüntüleyebilirsiniz. Onay sürecimiz genellikle birkaç günde sonuçlanıyor. İşleminizi hızlandırmak için bizimle iletişime geçmekten çekinmeyin.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="performance-section" className="p-6 bg-gray-800/50 backdrop-blur-xl border border-white/5 rounded-xl shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-gray-200">Performans Alanı</h2>
          <div id="current-balance" className="text-4xl font-extrabold text-right text-cyan-400">
            Bakiye: {loading ? 'Yükleniyor…' : `${balance?.toFixed(2) ?? '0.00'} TL`}
          </div>

          {/* Performans Ayrıntıları */}
          {codes.length === 0 || !codes.find(c => c.is_active) ? (
            <div className="text-base text-gray-200 space-y-3 leading-relaxed">
              <p>Oluşturduğunuz indirim kodu ile gerçekleşen alışverişlerin detaylarını bu panel üzerinden takip edebilirsiniz.</p>
              <p>Affiliate sistemimizi, şeffaf ve sizin yararınıza olacak şekilde esnek tutmaya özen gösteriyoruz. Herhangi bir yanıltıcı bilgi kullanmadığınız sürece, indirim kodunuzu dilediğiniz içerik formatında ve kendi niş alanınızda özgürce kullanabilirsiniz. Bu konuda katı kurallarımız yok; yalnızca önerilerde bulunabiliriz.</p>
              <p>Deneyimlerimize göre, ürün inceleme içerikleri en yüksek satış dönüşümünü sağlamaktadır. Bunun yanında, niş içeriklerinizin içine ürünü tanıtan kısa bölümler eklemek de etkili bir yöntemdir. İçerik üretiminde uzman sizsiniz; bu sürece kendi tarzınızı yansıtmanızı destekliyoruz.</p>
              <p>Ürünümüz <a href="https://karekodqrmenu.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">karekodqrmenu.com</a> sürekli olarak geliştirilmektedir. Yeni özelliklerden haberdar olmak için siteyi düzenli aralıklarla ziyaret etmeniz faydanıza olacaktır.</p>
              <p>Ürünümüzün pazarlama stratejileri içinde affiliate sistemine özel bir önem veriyoruz. Yalnızca sunduğumuz yüksek komisyon oranlarıyla değil, sizi pazarlama ekibimizin bir parçası olarak hissettirmek istiyoruz. Herhangi bir sorunuz ya da desteğe ihtiyaç duyduğunuz bir konu olursa, bizimle iletişime geçmekten çekinmeyin.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {latestSales.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Son Alışverişler ({codes.find(c => c.is_active)?.code} Kodu ile)</h3>
                  <div id="sales-history-table" className="overflow-x-auto bg-gray-800/50 backdrop-blur-xl border-white/5 rounded-lg shadow-md">
                    <table className="min-w-full text-sm text-left text-gray-200">
                      <thead className="text-xs text-gray-200 uppercase bg-gray-800/50 backdrop-blur-xl border-white/5 border-b">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-cyan-400">Tarih</th>
                          <th scope="col" className="px-4 py-3 text-violet-400">Müşteri URL</th>
                          <th scope="col" className="px-4 py-3 text-cyan-400">Ürün</th>
                          <th scope="col" className="px-4 py-3 text-violet-400">Tutar</th>
                          <th scope="col" className="px-4 py-3 text-cyan-400">Komisyon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestSales.map((sale) => (
                          <tr key={sale.id} className="bg-gray-800/50 backdrop-blur-xl border-white/5 border-b hover:bg-gray-700/50 transition-colors duration-150">
                            <td className="px-4 py-3">{new Date(sale.recorded_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3"><a href={sale.customer_url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">{sale.customer_url}</a></td>
                            <td className="px-4 py-3">{sale.product}</td>
                            <td className="px-4 py-3">{sale.total_amount?.toFixed(2) ?? '0.00'} TL</td>
                            <td className="px-4 py-3">{sale.commission?.toFixed(2) ?? '0.00'} TL</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

           {/* Sayfalama Kontrolleri */}
           {totalSalesCount > itemsPerPage && (
             <div className="flex justify-center items-center space-x-4 mt-6">
               <button
                 onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                 disabled={currentPage === 1}
                 className="px-4 py-2 rounded-lg bg-gray-80/50 backdrop-blur-xl border-white/5 text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 hover:bg-gradient-to-r from-cyan-500 to-violet-500"
               >
                 &larr; Önceki
               </button>
               <span className="text-gray-200">
                 Sayfa {currentPage} / {Math.ceil(totalSalesCount / itemsPerPage)}
               </span>
               <button
                 onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(totalSalesCount / itemsPerPage), prev + 1))}
                 disabled={currentPage === Math.ceil(totalSalesCount / itemsPerPage)}
                 className="px-4 py-2 rounded-lg bg-gray-800/50 backdrop-blur-xl border-white/5 text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 hover:bg-gradient-to-r from-cyan-500 to-violet-500"
               >
                 Sonraki &rarr;
               </button>
             </div>
           )}

              {latestSettlement && (
                <div id="latest-payment-info">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Son Ödeme Bilgileri</h3>
                  <div className="bg-gray-800/50 backdrop-blur-xl border-white/5 p-5 rounded-lg shadow-md text-base text-gray-200 space-y-2">
                    <p><strong>Tarih:</strong> <span className="font-semibold text-white">{new Date(latestSettlement.date).toLocaleDateString()}</span></p>
                    <p><strong>Ödeme Miktarı:</strong> <span className="font-semibold text-white">{latestSettlement.amount?.toFixed(2) ?? '0.00'} TL</span></p>
                    <p><strong>Ödeme Öncesi Bakiye:</strong> <span className="font-semibold text-white">{latestSettlement.balance_before_settlement?.toFixed(2) ?? '0.00'} TL</span></p>
                    <p><strong>Ödeme Sonrası Bakiye:</strong> <span className="font-semibold text-white">{latestSettlement.balance_after_settlement?.toFixed(2) ?? '0.00'} TL</span></p>
                  </div>
                </div>
              )}

              <div className="text-right mt-6">
                <Link href="/influencer/balance" id="payment-history-link" className="text-violet-400 hover:text-violet-300 underline text-base font-medium">
                  Ödeme Geçmişi &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Genel Performans Grafiği */}
          {stats?.salesTrend && (
            <div id="performance-chart" className="mt-8">
              <h3 className="text-xl font-semibold text-gray-200 mb-4">Genel Performans Grafiği (Son 30 Gün)</h3>
              <p className="text-sm text-gray-200 mb-4">Satış adedi ve komisyon trendini zaman içinde görüntüleyin.</p>
              <div className="bg-gray-800/50 backdrop-blur-xl border-white/5 p-5 rounded-lg shadow-inner">
                <Line data={stats.salesTrend} />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
