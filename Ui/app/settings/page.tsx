'use client';

import { useState } from 'react';

type TabKey = 'general' | 'security' | 'integrations' | 'templates';

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('general');

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <a href="/commissions" className="inline-flex items-center rounded-md bg-gray-800 text-white px-3 py-2 text-sm hover:bg-black">
          Komisyonlar
        </a>
      </div>

      <div className="border-b flex items-center gap-3">
        {(
          [
            { key: 'general', label: 'Genel' },
            { key: 'security', label: 'Güvenlik' },
            { key: 'integrations', label: 'Entegrasyonlar' },
            { key: 'templates', label: 'Bildirim Şablonları' },
          ] as Array<{key: TabKey; label: string}>
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="space-y-4 rounded-md border bg-white p-4 max-w-3xl">
          <div className="font-medium">Genel Ayarlar</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">Marka Adı</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="AfiLite" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Zaman Dilimi</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Europe/Istanbul" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Para Birimi</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="TRY" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Tarih Biçimi</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="dd.MM.yyyy HH:mm" />
            </div>
          </div>
          <div>
            <button className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">Kaydet</button>
          </div>
        </section>
      )}

      {tab === 'security' && (
        <section className="space-y-4 rounded-md border bg-white p-4 max-w-3xl">
          <div className="font-medium">Güvenlik</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">JWT Süresi (dakika)</label>
              <input type="number" min={1} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="15" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Parola Politikası</label>
              <select className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option>Temel</option>
                <option>Orta</option>
                <option>Katı</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block">2FA Zorunlu</label>
              <select className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option>Hayır</option>
                <option>Evet</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block">CORS Origin(ler)</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="https://admin.example.com" />
            </div>
          </div>
          <div>
            <button className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">Kaydet</button>
          </div>
        </section>
      )}

      {tab === 'integrations' && (
        <section className="space-y-4 rounded-md border bg-white p-4 max-w-3xl">
          <div className="font-medium">Entegrasyonlar</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block">SMTP (URL)</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="smtp://user:pass@mail.example.com:587" />
            </div>
            <div>
              <label className="text-sm mb-1 block">SMS Sağlayıcı API Key</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="SMS_XXXX" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Ödeme Sağlayıcı API Key</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="PAY_XXXX" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Analitik (ör. GA4) Measurement ID</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="G-XXXXXXXX" />
            </div>
          </div>
          <div>
            <button className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">Kaydet</button>
          </div>
        </section>
      )}

      {tab === 'templates' && (
        <section className="space-y-4 rounded-md border bg-white p-4">
          <div className="font-medium">Bildirim Şablonları</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TemplateCard
              title="Başvuru Onayı"
              variables={['{{name}}', '{{code}}']}
              sample={`Merhaba {{name}}, başvurunuz onaylandı. Kodunuz: {{code}}`}
            />
            <TemplateCard
              title="Ödeme Onayı"
              variables={['{{name}}', '{{amount}}', '{{currency}}']}
              sample={`Merhaba {{name}}, {{amount}} {{currency}} tutarındaki ödemeniz onaylandı.`}
            />
            <TemplateCard
              title="Statü Değişikliği"
              variables={['{{name}}', '{{old_status}}', '{{new_status}}']}
              sample={`Merhaba {{name}}, statünüz {{old_status}} → {{new_status}} olarak güncellenmiştir.`}
            />
            <TemplateCard
              title="Şifre Sıfırlama"
              variables={['{{name}}', '{{reset_link}}']}
              sample={`Merhaba {{name}}, şifre sıfırlama bağlantınız: {{reset_link}}`}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function TemplateCard({ title, variables, sample }: { title: string; variables: string[]; sample: string }) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3 font-medium">{title}</div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Kullanılabilir Değişkenler</div>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <code key={v} className="bg-gray-100 rounded px-2 py-1 text-xs">{v}</code>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Şablon (örnek)</div>
          <textarea className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2" defaultValue={sample} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700">Kaydet</button>
          <button className="rounded-md border px-3 py-2 text-sm">Test Gönder</button>
        </div>
      </div>
    </div>
  );
}