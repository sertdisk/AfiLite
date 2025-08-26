/* Kısa açıklama: İndirim Kodları Liste Sayfası (Server Component)
   - Relative /api proxy ile GET /codes çağrısı yapar (cookie otomatik taşınır)
   - Tailwind ile minimal tablo render eder
   - Boş durum ve hata durumlarını gösterir
*/
import { cookies } from 'next/headers';

type CodeItem = {
  id: number;
  code: string;
  discount_pct: number;
  commission_pct: number;
  is_active: boolean;
  created_at?: string;
  influencer_name?: string | null;
  influencer_email?: string | null;
};

async function fetchCodes(): Promise<{ codes: CodeItem[] }> {
  // Cookie otomatik taşınsın diye relative proxy kullanıyoruz
  // Backend tarafında /codes GET → src/routes/codes.js:37-55
  const res = await fetch('/api/codes', {
    // Next.js App Router server-side fetch
    // next: { revalidate: 0 } => her istekte taze veri (dev aşaması)
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kod listesi getirilemedi (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json().catch(() => ({} as any));
  return data;
}

export default async function CodesPage() {
  // JWT cookie var mı hızlı kontrol (isteğe bağlı; asıl yetki server proxy/route'ta)
  const jwtCookie = cookies().get('jwt')?.value;

  let codes: CodeItem[] = [];
  let error: string | null = null;

  try {
    const data = await fetchCodes();
    codes = Array.isArray(data?.codes) ? data.codes : [];
  } catch (e: any) {
    error = e?.message || 'Kod listesi yüklenirken hata oluştu';
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">İndirim Kodları</h1>
        <a
          href="/codes/new"
          className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          Yeni Kod
        </a>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {!error && codes.length === 0 && (
        <div className="rounded-md border bg-white p-6 text-center text-gray-600">
          Henüz kod bulunmuyor.
        </div>
      )}

      {!error && codes.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Kod</th>
                <th className="px-4 py-2 text-left">İndirim %</th>
                <th className="px-4 py-2 text-left">Komisyon %</th>
                <th className="px-4 py-2 text-left">Influencer</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-left">Oluşturma</th>
                <th className="px-4 py-2 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{c.code}</td>
                  <td className="px-4 py-2">{c.discount_pct}</td>
                  <td className="px-4 py-2">{c.commission_pct}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span>{c.influencer_name || '-'}</span>
                      <span className="text-xs text-gray-500">{c.influencer_email || ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {c.is_active ? (
                      <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={`/codes/${c.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Detay
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}