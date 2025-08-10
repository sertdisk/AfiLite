'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getInfluencerSummary,
  createMyDiscountCode,
  getMyBalance,
  getMySettlements,
  getMySales,
  getUnreadAlerts,
  markAlertRead,
  SystemAlert
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
  const [alerts, setAlerts] = useState<SystemAlert[]>([]); // Sistem uyarıları state'i

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

  useEffect(() => {

    (async () => {
      try {
        const s = await getInfluencerSummary();
        setSummary(s);

        // Sistem uyarılarını çek
        const unreadAlerts = await getUnreadAlerts();
        setAlerts(unreadAlerts);

        // Influencer'ın kodlarını çek
        // Backend'de GET /codes/me uç noktası varsa listMyCodesUnsafe kullanılabilir.
        // Şimdilik mock veri veya boş dizi ile devam ediyoruz.
        // const myCodes = await listMyCodesUnsafe();
        // setCodes(myCodes.items || []);

        // Bakiye ve performans verilerini çek
        const b = await getMyBalance();
        setBalance(b?.total_balance ?? 0);

        const settlements = await getMySettlements();
        if (settlements?.items && settlements.items.length > 0) {
          setLatestSettlement(settlements.items[0]); // En son ödeme
        }

        // Eğer kod varsa, o koda ait satışları çek (sayfalama ile)
        if (codes.length > 0 && codes[0].code) {
          const sales = await getMySales({
            code: codes[0].code,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
          });
          setLatestSales(sales?.items || []);
          setTotalSalesCount(sales?.total_count ?? 0);
        }

      } catch (e: any) {
        setServerError(e?.message || 'Veriler alınamadı: ' + e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [codes.length, currentPage, itemsPerPage]); // codes.length, currentPage, itemsPerPage değiştiğinde tekrar çalıştır

  const handleDismissAlert = async (alertId: number) => {
    try {
      // Uyarıyı okundu olarak işaretle
      await markAlertRead(alertId);
      
      // Yerel state'ten kaldır
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error('Uyarı kapatma hatası:', e);
    }
  };

  const weeklySalesData = useMemo(() => {
    // Örnek performans verisi (ileride gerçek API ile değiştirilecek)
    const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const data = [3, 5, 2, 8, 6, 4, 7];
    return {
      labels,
      datasets: [
        {
          label: 'Haftalık Satış Adedi',
          data,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.35
        }
      ]
    };
  }, []);

  function getDemoSeriesForCode(code: string) {
    const labels = Array.from({ length: 12 }).map((_, i) => `Hafta ${i + 1}`);
    const seed = code.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const values = labels.map((_, i) => (Math.abs(Math.sin(seed + i)) * 10 + (i % 3) * 2 + 3).toFixed(0)).map(Number);
    return {
      labels,
      datasets: [
        {
          label: 'Satış Adedi',
          data: values,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.35
        }
      ]
    };
  }

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
      setCodes((prev) => {
        if (prev.length >= 1) return prev; // Sadece bir kod olmasına izin veriyoruz
        return [...prev, newCode];
      });
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8" id="dashboard-header">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Influencer Panosu
          </h1>
          <p className="text-lg text-gray-400">Genel durumunuzu ve temel performans özetini tek bakışta görün.</p>
        </header>

        {/* Sistem Uyarıları */}
        {alerts.map(alert => (
          <aside key={alert.id} className="p-6 border border-yellow-600 rounded-xl bg-yellow-900/20 text-yellow-100 shadow-xl space-y-4 animate-fade-in">
            <p className="font-bold text-xl flex items-center text-yellow-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Sistem Uyarısı
            </p>
            <p className="text-base leading-relaxed text-gray-200">{alert.message}</p>
            <button
              onClick={() => handleDismissAlert(alert.id)}
              className="mt-4 px-6 py-2 rounded-lg bg-yellow-700 text-white font-semibold hover:bg-yellow-600 transition-colors duration-300 ease-in-out shadow-md transform hover:scale-105"
            >
              Okudum Anladım
            </button>
          </aside>
        ))}

        {serverError && (
          <div role="alert" className="text-sm bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 shadow-md">{serverError}</div>
        )}

        <section id="application-status-section" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Başvuru Durumu</div>
            <div className="text-xl font-semibold text-white">{loading ? 'Yükleniyor…' : (summary?.status ?? '—')}</div>
          </div>
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Başvuru Tarihi</div>
            <div className="text-xl font-semibold text-white">{loading ? 'Yükleniyor…' : (summary?.created_at ? new Date(summary.created_at).toLocaleDateString() : '—')}</div>
          </div>
          <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Gün</div>
            <div className="text-xl font-semibold text-white">{loading ? 'Yükleniyor…' : (summary?.days_since_application ?? '—')}</div>
          </div>
        </section>

        <section id="code-management-section" className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 space-y-6">
          {codeMessage && <div className="text-sm bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 text-emerald-300 shadow-md">{codeMessage}</div>}

          {codes.length === 0 ? (
            <div className="space-y-4">
              <div className="p-8 border border-dashed border-gray-600 rounded-xl text-center space-y-5 bg-gray-900/40">
                <p className="text-xl font-bold text-gray-200">Henüz bir kodunuz görünmüyor.</p>
                <p className="text-base text-gray-400 leading-relaxed">
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
                    className="flex-grow max-w-xs px-5 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200 text-lg"
                  />
                  <button
                    type="submit"
                    disabled={createBusy || newCodeInput.length < 5 || newCodeInput.length > 10}
                    className={`px-6 py-2.5 rounded-lg font-bold text-lg ${createBusy || newCodeInput.length < 5 || newCodeInput.length > 10 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105`}
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
                const chartData = getDemoSeriesForCode(c.code);
                const isActive = !(c.is_active === false || Number(c.is_active) === 0);
                return (
                  <article key={c.id} id={`code-card-${c.id}`} className="p-6 border border-gray-700 rounded-xl bg-gray-900 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                      <div className="mb-2 sm:mb-0">
                        <h3 className="text-3xl font-bold text-blue-400">KOD: {c.code}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Oluşturulma Tarihi: {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                          {isActive ? (
                            <>
                              {' '}· Onay Tarihi: {c.approved_at ? new Date(c.approved_at).toLocaleDateString() : '—'}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${isActive ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
                        {isActive ? 'Aktif' : 'Onay için bekliyor'}
                      </span>
                    </div>

                    {isActive ? (
                      <div className="text-base text-gray-300 mb-4 space-y-1">
                        <p>İndirim Oranı: <span className="font-bold text-white">%{c.discount_pct}</span></p>
                        <p>Komisyon Oranı: <span className="font-bold text-white">%{c.commission_pct}</span></p>
                      </div>
                    ) : (
                      <p className="text-base text-gray-400 mt-2 leading-relaxed">
                        Oluşturduğunuz kod aktif hale geldiğinde, bu kod aracılığıyla yapılan her satışta, müşteriniz indirim kazanırken siz de tanımlanan oran üzerinden komisyon elde edeceksiniz. Komisyon oranlarını, kod aktif olduğunda sistem üzerinden görüntüleyebilirsiniz. Onay sürecimiz genellikle birkaç günde sonuçlanıyor. İşleminizi hızlandırmak için bizimle iletişime geçmekten çekinmeyin.
                      </p>
                    )}

                    {isActive && (
                      <div className="mt-8">
                        <h4 className="text-xl font-semibold text-gray-200 mb-4">Performans Trendi</h4>
                        <p className="text-sm text-gray-400 mb-4">Bu kod için satış trendi ve dönüşüm performansı.</p>
                        <div className="bg-gray-700 p-5 rounded-lg shadow-inner">
                          <Line data={chartData} />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              <div className="text-right mt-6">
                <Link href="/influencer/codes" className="text-blue-400 hover:text-blue-300 underline text-base font-medium">
                  Tüm kodlarımı görüntüle &rarr;
                </Link>
              </div>
            </div>
          )}
        </section>

        <section id="performance-section" className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 space-y-6">
          <h2 className="text-xl font-bold text-gray-100">Performans Alanı</h2>
          <div id="current-balance" className="text-4xl font-extrabold text-right text-blue-400">
            Bakiye: {loading ? 'Yükleniyor…' : `${balance?.toFixed(2) ?? '0.00'} TL`}
          </div>

          {/* Performans Ayrıntıları */}
          {codes.length === 0 || !codes[0].is_active || latestSales.length === 0 ? (
            <div className="text-base text-gray-300 space-y-3 leading-relaxed">
              <p>Oluşturduğunuz indirim kodu ile gerçekleşen alışverişlerin detaylarını bu panel üzerinden takip edebilirsiniz.</p>
              <p>Affiliate sistemimizi, şeffaf ve sizin yararınıza olacak şekilde esnek tutmaya özen gösteriyoruz. Herhangi bir yanıltıcı bilgi kullanmadığınız sürece, indirim kodunuzu dilediğiniz içerik formatında ve kendi niş alanınızda özgürce kullanabilirsiniz. Bu konuda katı kurallarımız yok; yalnızca önerilerde bulunabiliriz.</p>
              <p>Deneyimlerimize göre, ürün inceleme içerikleri en yüksek satış dönüşümünü sağlamaktadır. Bunun yanında, niş içeriklerinizin içine ürünü tanıtan kısa bölümler eklemek de etkili bir yöntemdir. İçerik üretiminde uzman sizsiniz; bu sürece kendi tarzınızı yansıtmanızı destekliyoruz.</p>
              <p>Ürünümüz <a href="https://karekodqrmenu.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">karekodqrmenu.com</a> sürekli olarak geliştirilmektedir. Yeni özelliklerden haberdar olmak için siteyi düzenli aralıklarla ziyaret etmeniz faydanıza olacaktır.</p>
              <p>Ürünümüzün pazarlama stratejileri içinde affiliate sistemine özel bir önem veriyoruz. Yalnızca sunduğumuz yüksek komisyon oranlarıyla değil, sizi pazarlama ekibimizin bir parçası olarak hissettirmek istiyoruz. Herhangi bir sorunuz ya da desteğe ihtiyaç duyduğunuz bir konu olursa, bizimle iletişime geçmekten çekinmeyin.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {latestSales.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Son Alışverişler ({codes[0].code} Kodu ile)</h3>
                  <div id="sales-history-table" className="overflow-x-auto bg-gray-700 rounded-lg shadow-md">
                    <table className="min-w-full text-sm text-left text-gray-300">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-700 border-b border-gray-600">
                        <tr>
                          <th scope="col" className="px-4 py-3">Tarih</th>
                          <th scope="col" className="px-4 py-3">Müşteri URL</th>
                          <th scope="col" className="px-4 py-3">Ürün</th>
                          <th scope="col" className="px-4 py-3">Tutar</th>
                          <th scope="col" className="px-4 py-3">Komisyon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestSales.map((sale) => (
                          <tr key={sale.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-150">
                            <td className="px-4 py-3">{new Date(sale.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3"><a href={sale.customer} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{sale.customer}</a></td>
                            <td className="px-4 py-3">{sale.package_name}</td>
                            <td className="px-4 py-3">{sale.package_amount?.toFixed(2) ?? '0.00'} TL</td>
                            <td className="px-4 py-3">{sale.commission_amount?.toFixed(2) ?? '0.00'} TL</td>
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
                 className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
               >
                 &larr; Önceki
               </button>
               <span className="text-gray-300">
                 Sayfa {currentPage} / {Math.ceil(totalSalesCount / itemsPerPage)}
               </span>
               <button
                 onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(totalSalesCount / itemsPerPage), prev + 1))}
                 disabled={currentPage === Math.ceil(totalSalesCount / itemsPerPage)}
                 className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
               >
                 Sonraki &rarr;
               </button>
             </div>
           )}

              {latestSettlement && (
                <div id="latest-payment-info">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Son Ödeme Bilgileri</h3>
                  <div className="bg-gray-700 p-5 rounded-lg shadow-md text-base text-gray-300 space-y-2">
                    <p><strong>Tarih:</strong> <span className="font-semibold text-white">{new Date(latestSettlement.date).toLocaleDateString()}</span></p>
                    <p><strong>Ödeme Miktarı:</strong> <span className="font-semibold text-white">{latestSettlement.amount?.toFixed(2) ?? '0.00'} TL</span></p>
                    {/* Ödeme öncesi/sonrası bakiye bilgisi API'den gelmediği için mock değerler */}
                    <p><strong>Ödeme Öncesi Bakiye:</strong> <span className="font-semibold text-white">{(balance + latestSettlement.amount)?.toFixed(2) ?? '0.00'} TL</span></p>
                    <p><strong>Ödeme Sonrası Bakiye:</strong> <span className="font-semibold text-white">{balance?.toFixed(2) ?? '0.00'} TL</span></p>
                  </div>
                </div>
              )}

              <div className="text-right mt-6">
                <Link href="/influencer/balance" id="payment-history-link" className="text-blue-400 hover:text-blue-300 underline text-base font-medium">
                  Ödeme Geçmişi &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Genel Performans Grafiği */}
          <div id="performance-chart" className="mt-8">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Genel Performans Grafiği</h3>
            <p className="text-sm text-gray-400 mb-4">Satış adedi trendini zaman içinde görüntüleyin. (Örnek Veri)</p>
            <div className="bg-gray-700 p-5 rounded-lg shadow-inner">
              <Line data={weeklySalesData} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}