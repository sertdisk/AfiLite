'use client';

/* Kod Ekle Sayfası (Client Component)
   - Basit form: influencer_id (number), code (opsiyonel), discount_pct, commission_pct, is_active (varsayılan true)
   - Submit: POST /api/codes (UI proxy) → backend POST /codes
   - Başarıyla oluşturulunca /codes listesine yönlendirir
*/

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCodePage() {
  const router = useRouter();
  const [influencerId, setInfluencerId] = useState('');
  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState(10);
  const [commissionPct, setCommissionPct] = useState(40);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Array<{ id: number; name: string; email?: string; social_handle?: string }>>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  async function searchInfluencers(q: string) {
    if (!q || q.trim().length < 2) {
      setOptions([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const params = new URLSearchParams({ q, limit: '20', page: '1' });
      const res = await fetch(`/api/influencers?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) {
        // Sessizce düş
        setOptions([]);
        return;
      }
      let json: any = [];
      try { json = JSON.parse(text || '[]'); } catch { json = []; }
      const list = Array.isArray(json) ? json : (json?.influencers || []);
      const mapped = (list || []).map((r: any) => ({
        id: Number(r?.id),
        name: String(r?.name || ''),
        email: r?.email,
        social_handle: r?.social_handle,
      }));
      setOptions(mapped);
    } catch {
      setOptions([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  function onPickInfluencer(opt: { id: number; name: string; email?: string; social_handle?: string }) {
    setInfluencerId(String(opt.id));
    setQuery(`${opt.name}${opt.email ? ' • ' + opt.email : ''}${opt.social_handle ? ' • ' + opt.social_handle : ''}`);
    setShowOptions(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Basit alan doğrulamaları
    const inflIdNum = Number(influencerId);
    if (!influencerId || Number.isNaN(inflIdNum) || inflIdNum <= 0) {
      setError('Geçerli bir influencer_id giriniz (pozitif sayı).');
      return;
    }
    if (discountPct < 1 || discountPct > 100) {
      setError('İndirim yüzdesi 1-100 arasında olmalıdır.');
      return;
    }
    if (commissionPct < 1 || commissionPct > 100) {
      setError('Komisyon yüzdesi 1-100 arasında olmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      // UI proxy: /api/codes → backend /codes
      const res = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          influencer_id: inflIdNum,
          code: code || undefined, // opsiyonel
          discount_percentage: discountPct,
          commission_pct: commissionPct,
          is_active: isActive,
        }),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        let msg = text;
        try {
          const maybe = JSON.parse(text || '{}');
          msg = maybe?.message || maybe?.error || msg;
        } catch {}
        setError(msg || 'Kod oluşturma başarısız.');
        return;
      }

      // Başarılı — listeye dön
      router.push('/codes');
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Yeni Kod Oluştur</h1>
        <a href="/codes" className="text-blue-600 hover:text-blue-800 text-sm">Listeye Dön</a>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 max-w-lg bg-white rounded-md border p-6">
        {/* Influencer seçimi (autocomplete + readonly id) */}
        <div className="space-y-2">
          <label className="block text-sm" htmlFor="influencer_search">Influencer</label>
          <div className="relative">
            <input
              id="influencer_search"
              type="text"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                setShowOptions(true);
                if (val.trim().length >= 2) searchInfluencers(val);
                else setOptions([]);
              }}
              onFocus={() => {
                setShowOptions(true);
                if (query.trim().length >= 2) searchInfluencers(query);
              }}
              placeholder="İsim / Email / Handle (min 2 karakter)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            {showOptions && (options.length > 0 || loadingSearch) && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
                {loadingSearch && (
                  <div className="px-3 py-2 text-sm text-gray-500">Aranıyor…</div>
                )}
                {!loadingSearch && options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => onPickInfluencer(opt)}
                  >
                    <div className="font-medium">{opt.name}</div>
                    <div className="text-xs text-gray-500">
                      {opt.email || '—'} {opt.social_handle ? ` • ${opt.social_handle}` : ''}
                    </div>
                  </button>
                ))}
                {!loadingSearch && options.length === 0 && query.trim().length >= 2 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Sonuç yok</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" htmlFor="influencer_id">Influencer ID</label>
              <input
                id="influencer_id"
                name="influencer_id"
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-700"
                value={influencerId}
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Seçim sonrası ID burada readonly gösterilir.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="code">Kod (Opsiyonel)</label>
          <input
            id="code"
            name="code"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Örn: AHMET15 (boş bırakırsanız otomatik üretilecek)"
          />
          <p className="text-xs text-gray-500 mt-1">4-16 karakter A-Z0-9; boş bırakılırsa otomatik üretim denenir.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="discount_pct">İndirim %</label>
            <input
              id="discount_pct"
              name="discount_pct"
              type="number"
              required
              min={1}
              max={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value))}
            />
            <p className="text-[11px] text-gray-500 mt-1">Varsayılan: %10 — değiştirilebilir.</p>
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="commission_pct">Komisyon %</label>
            <input
              id="commission_pct"
              name="commission_pct"
              type="number"
              required
              min={1}
              max={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
            />
            <p className="text-[11px] text-gray-500 mt-1">Varsayılan: %40 — değiştirilebilir.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            className="h-4 w-4"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="is_active" className="text-sm">Aktif</label>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {(!influencerId || Number.isNaN(Number(influencerId))) && (
          <div className="text-xs text-amber-600">Lütfen üstten influencer seçin (ID alanı otomatik dolar).</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
        </button>
      </form>
    </main>
  );
}