# AfiLite Mimarisi

Bu doküman, AfiLite projesinin dosya/dizin yapısını, Admin ve Influencer alanları için kullanılan backend API rotalarını ve frontend (UI) dosyalarını özetlemektedir. yazılım geliştiriciye çalışmalarında neyin nerede oldugü, nasıl çalıştığı hakkında rehberlik etmesi için hazırlanmıştır.

# düzenleme manifestosu

Bu belge, projeyi inceleyen yazılım ekibi veya yapay zekaya; proje yapısı hakkında ihtiyaç duyduğu tüm gerekli bilgileri sunmak için düzenlenir. Proje üzerinde çalışan yada çalışacaklara neyin nerede olduğu bilgileri ile rehberlik eder. örn: dosya/dizin yapısı, api yapısı, endpointler vb.
-Yapılan değişiklikler listesi değildir. Ancak yapılan işlem/işlemler sonucunda mimaride değişiklik oldu ise, son çalışan hali ile güncellenir.
-son yapılan işlemler listesi değildir.


## Genel Bakış

- **Backend Sunucusu**: `http://localhost:5003`
- **Frontend Sunucusu**: `http://localhost:4000`
- **API Temel Yolu (Base Path)**: `/api/v1/`
- **Kimlik Doğrulama**: JWT (JSON Web Token) tabanlıdır. Token, login sonrası `jwt_admin` veya `jwt_influencer` adıyla HTTP-only cookie olarak saklanır.

---

## Veritabanı Şeması Notları

- **`influencers` Tablosu**: Influencer'ın tam adını tutan sütun `full_name`'dir. Rota dosyalarında (`*.js`) sorgular bu sütunu kullanmalıdır. API yanıtlarında bu alan `name` olarak alias (takma ad) ile gönderilebilir, ancak veritabanı sorguları doğrudan `full_name`'i hedeflemelidir.
- **Migration Dosyaları**: `src/db/migrations` altında `2024080210000_init.js` ve `20240804120000_influencers.js` gibi birden fazla `influencers` tablosu oluşturma girişimi bulunmaktadır. Bu durum kafa karışıklığına yol açabilir. Mevcut durumda, `20240802100000_init.js` dosyasındaki şema (`full_name` içeren) geçerli olarak kabul edilmektedir. Yeni geliştirmelerde bu tutarlılığın korunması önemlidir.

---

## 1. Admin Alanı

Admin paneli, tüm sistemi yönetme yetkisine sahip olan kullanıcılar içindir. Genellikle `requireAdmin` ara katmanı (middleware) ile korunur.

### Backend API Rotaları (Admin)

| Metot | Rota | Açıklama | Kaynak Dosya |
| --- | --- | --- | --- |
| **Auth** | |
| `POST` | `/api/v1/auth/admin/login` | Admin kullanıcısı için giriş yapar ve token oluşturur. | `src/routes/auth.js` |
| `POST` | `/auth/setup-admin` | Sisteme ilk admin kullanıcısını kurar. | `src/routes/auth.js` |
| **Influencer Yönetimi** | |
| `GET` | `/influencers` | Tüm influencer'ları listeler (sayfalama, arama, filtreleme destekli). | `src/routes/influencer.js` |
| `GET` | `/influencers/search` | Ad, email veya marka adına göre influencer arar. | `src/routes/influencer.js` |
| `GET` | `/influencers/:id` | Belirli bir influencer'ın detaylarını getirir. | `src/routes/influencer.js` |
| `PATCH` | `/influencers/:id` | Bir influencer'ın bilgilerini (ad, email, durum, notlar vb.) günceller. | `src/routes/influencer.js` |
| **Başvuru Yönetimi** | |
| `GET` | `/apply` | Tüm influencer başvurularını listeler. | `src/routes/apply.js` |
| `GET` | `/apply/:id` | Tek bir başvurun detayını getirir. | `src/routes/apply.js` |
| `PATCH` | `/apply/:id/status` | Bir başvurunun durumunu günceller (pending, approved, rejected). | `src/routes/apply.js` |
| **Kod Yönetimi** | |
| `GET` | `/codes` | Tüm indirim kodlarını, ilişkili influencer bilgileriyle listeler. | `src/routes/codes.js` |
| `GET` | `/codes/influencer/:id` | Belirli bir influencer'a ait tüm kodları listeler. | `src/routes/codes.js` |
| `POST` | `/codes` | Belirli bir influencer için yeni bir indirim kodu oluşturur. | `src/routes/codes.js` |
| `PUT` | `/codes/:id` | Bir indirim kodunu günceller (oranlar, aktif/pasif durumu). | `src/routes/codes.js` |
| `DELETE` | `/codes/:id` | Bir indirim kodunu siler. | `src/routes/codes.js` |
| `GET` | `/codes/export` | Filtrelenmiş kod listesini CSV veya XLSX formatında dışa aktarır. | `src/routes/codes.js` |
| **Satış ve Komisyon Yönetimi** | |
| `GET` | `/sales` | Tüm satışları, detaylı filtreleme seçenekleriyle listeler. | `src/routes/sale.js` |
| `PATCH` | `/sales/:id` | Bir satış kaydını günceller (tutar, müşteri URL'si, not vb.). | `src/routes/sale.js` |
| `GET` | `/sales/export` | Filtrelenmiş satış listesini CSV veya XLSX formatında dışa aktarır. | `src/routes/sale.js` |
| `GET` | `/commissions` | Tüm komisyon kayıtlarını listeler. | `src/routes/commissions.js` |
| `GET` | `/commissions/export` | Komisyon kayıtlarını dışa aktarır. | `src/routes/commissions.js` |
| **Ödeme ve Bakiye Yönetimi** | |
| `GET` | `/balance/admin-summary/summary` | Tüm sistemin genel bakiye özetini (toplam komisyon, ödeme vb.) getirir. | `src/routes/balance.js` |
| `GET` | `/balance/influencer/:influencerId/summary` | Belirli bir influencer'ın bakiye özetini getirir. | `src/routes/balance.js` |
| `GET` | `/payouts` | Tüm ödeme taleplerini ve geçmişini listeler. | `src/routes/payouts.js` |
| `POST` | `/payouts` | Bir influencer için yeni bir ödeme kaydı oluşturur. | `src/routes/payouts.js` |
| `PATCH` | `/payouts/:id` | Bir ödeme kaydının durumunu veya notunu günceller. | `src/routes/payouts.js` |
| `GET` | `/payouts/export` | Ödeme kayıtlarını dışa aktarır. | `src/routes/payouts.js` |
| **Mesajlaşma ve Uyarılar** | |
| `POST` | `/messages` | Bir influencer'a özel mesaj gönderir. | `src/routes/messages.js` |
| `POST` | `/messages/bulk` | Tüm veya seçili influencer'lara toplu mesaj gönderir. | `src/routes/messages.js` |
| `GET` | `/messages/thread` | Bir influencer ile olan tüm konuşma geçmişini getirir. | `src/routes/messages.js` |
| `GET` | `/messages/admin-threads-summary` | Okunmamış mesajları da içeren tüm konuşma özetlerini listeler. | `src/routes/messages.js` |
| `POST` | `/alerts` | Tüm veya seçili influencer'lara sistem geneli uyarı gönderir. | `src/routes/alerts.js` |
| `GET` | `/alerts` | Gönderilmiş tüm sistem uyarılarını listeler. | `src/routes/alerts.js` |
| `DELETE` | `/alerts/:id` | Bir sistem uyarısını siler. | `src/routes/alerts.js` |
| `POST` | `/alerts/:id/read` | Bir sistem uyarısını okundu olarak işaretler. | `src/routes/alerts.js` |
| **Ayarlar ve Sözleşme** | |
| `POST` | `/admin/settings/commission-rates` | Tüm aktif kodların komisyon ve indirim oranlarını günceller. | `src/routes/settings.js` |
| `GET` | `/contracts` | Tüm sözleşme versiyonlarını listeler. | `src/routes/contract.js` |
| `POST` | `/contracts` | Yeni bir aktif sözleşme versiyonu oluşturur. | `src/routes/contract.js` |

### Frontend Rotaları ve Dosyaları (Admin)

Admin paneli, `Ui/app/admin/` dizini altında yer alır. Korunan rotalar `(protected)` grubundadır.

- **Giriş Sayfası**: `Ui/app/admin/login/page.tsx`
- **Çıkış**: `Ui/app/admin/logout/route.ts`
- **Ana Panel (Dashboard)**: `Ui/app/admin/(protected)/dashboard/page.tsx`
- **Influencer Listesi**: `Ui/app/admin/(protected)/influencers/page.tsx`
- **Influencer Detayı**: `Ui/app/admin/(protected)/influencers/[id]/page.tsx`
- **Satışlar**: `Ui/app/admin/(protected)/sales/page.tsx`
- **Komisyonlar**: `Ui/app/admin/(protected)/commissions/page.tsx`
- **Ödemeler**: `Ui/app/admin/(protected)/payouts/page.tsx`
- **İndirim Kodları**: `Ui/app/admin/(protected)/codes/page.tsx`
- **Mesajlar**: `Ui/app/admin/(protected)/messages/page.tsx`
- **Ayarlar**: `Ui/app/admin/(protected)/settings/page.tsx`

---

## 2. Influencer Alanı

Influencer'ların kendi bilgilerini, kodlarını, kazançlarını ve mesajlarını yönettikleri alandır. `authenticateToken` ara katmanı ile korunur ve genellikle sadece kullanıcının kendi kaynaklarına erişimine izin verilir.

### Backend API Rotaları (Influencer)

| Metot | Rota | Açıklama | Kaynak Dosya |
| --- | --- | --- |
| **Auth** | |
| `POST` | `/api/v1/auth/login` | Onaylanmış influencer için giriş yapar ve token oluşturur. | `src/routes/auth.js` |
| `POST` | `/auth/forgot-password` | Şifre sıfırlama talebi başlatır. | `src/routes/auth.js` |
| `POST` | `/auth/reset-password` | Şifre sıfırlama işlemini tamamlar. | `src/routes/auth.js` |
| **Dashboard** | |
| `GET` | `/influencer/summary` | Influencer'ın dashboard için özet bilgilerini (durum, başvuru tarihi vb.) getirir. | `src/routes/influencer-summary.js` |
| `GET` | `/influencer/performance/stats` | Influencer'ın satış performans istatistiklerini (grafikler için) getirir. | `src/routes/influencer-performance.js` |
| **Kod Yönetimi** | |
| `GET` | `/codes/my` | Influencer'ın kendine ait tüm kodları listeler. | `src/routes/codes.js` |
| `POST` | `/codes/my` | Influencer için yeni bir kod oluşturur (genellikle ilk kod). | `src/routes/codes.js` |
| **Bakiye ve Kazanç** | |
| `GET` | `/balance` | Influencer'ın toplam bakiyesini getirir. | `src/routes/balance.js` |
| `GET` | `/sales/me` | Influencer'ın kendi kodlarıyla yapılan satışları listeler. | `src/routes/balance.js` |
| `GET` | `/balance/history` | Influencer'a yapılan geçmiş ödemeleri listeler. | `src/routes/balance.js` |
| **Uyarılar ve Mesajlar** | |
| `GET` | `/messages/my-thread` | Influencer'ın admin ile olan konuşma geçmişini getirir. | `src/routes/messages.js` |
| `GET` | `/alerts/unread` | Influencer'ın okunmamış sistem uyarılarını getirir. | `src/routes/alerts.js` |
| `POST` | `/alerts/:id/read` | Bir uyarıyı okundu olarak işaretler. | `src/routes/alerts.js` |
| **Influencer Profil Yönetimi** | |
| `GET` | `/influencer/social-accounts` | Influencer'ın sosyal medya hesaplarını listeler. | `src/routes/influencer-settings.js` |
| `GET` | `/influencer/payment-accounts` | Influencer'ın ödeme hesaplarını listeler. | `src/routes/influencer-settings.js` |
| `PATCH` | `/influencer/me` | Influencer'ın profil bilgilerini günceller. | `src/routes/influencer-settings.js` |
| `PATCH` | `/influencer/me/password` | Influencer'ın şifresini günceller. | `src/routes/influencer-settings.js` |
| `POST` | `/influencer/social-accounts` | Influencer için yeni bir sosyal medya hesabı ekler. | `src/routes/influencer-settings.js` |
| **Sözleşme** | |
| `GET` | `/contracts/active` | Sistemdeki mevcut aktif sözleşmeyi getirir. | `src/routes/contract.js` |
| `PUT` | `/api/influencer/social-accounts/:id` | Influencer'ın sosyal medya hesabını günceller. | `src/routes/influencer-settings.js` |
| `DELETE` | `/api/influencer/social-accounts/:id` | Influencer'ın sosyal medya hesabını siler. | `src/routes/influencer-settings.js` |
| `POST` | `/api/influencer/payment-accounts` | Influencer için yeni bir ödeme hesabı ekler. | `src/routes/influencer-settings.js` |

### Yeni Eklenen API Fonksiyonları

| Fonksiyon Adı | Açıklama |
| --- | --- |
| `updateInfluencerSocialAccount` | Influencer'ın sosyal medya hesabını günceller. |
| `deleteInfluencerSocialAccount` | Influencer'ın sosyal medya hesabını siler. |
| `addInfluencerPaymentAccount` | Influencer için yeni bir ödeme hesabı ekler. |
| `sendMessage` | Bir influencer'a mesaj gönderir. |
| `getUnreadAlerts` | Influencer'ın okunmamış sistem uyarılarını getirir. |
| `markAlertRead` | Bir uyarıyı okundu olarak işaretler. |
| `getInfluencerPerformanceStats` | Influencer'ın satış performans istatistiklerini (grafikler için) getirir. |
### Frontend Rotaları ve Dosyaları (Influencer)

Influencer paneli `Ui/app/influencer/(protected)/` dizini altında yer alır.

- **Giriş Sayfası**: `Ui/app/login/page.tsx`
- **Çıkış**: `Ui/app/logout/route.ts`
- **Ana Panel (Dashboard)**: `Ui/app/influencer/(protected)/dashboard/page.tsx`
- **Performans**: `Ui/app/influencer/(protected)/performance/page.tsx`
- **Profilim**: `Ui/app/influencer/(protected)/profile/page.tsx`
- **Ödemelerim**: `Ui/app/influencer/(protected)/payouts/page.tsx`
- **Kodlarım**: `Ui/app/influencer/(protected)/codes/page.tsx`
- **Mesajlar**: `Ui/app/influencer/(protected)/messages/page.tsx`
- **Sözleşme**: `Ui/app/contract/page.tsx`

---

## 3. Public (Herkese Açık) Alan

Bu rotalar kimlik doğrulaması gerektirmez ve herkes tarafından erişilebilir.

### Backend API Rotaları (Public)

| Metot | Rota | Açıklama | Kaynak Dosya |
| --- | --- | --- | --- |
| `POST` | `/apply` | Yeni bir influencer başvurusu alır. | `src/routes/apply.js` |
### Dosya/Dizin Yapısındaki Değişiklikler

- `Ui/lib/api.ts` dosyasına yeni fonksiyonlar eklendi
- `src/routes/influencer-settings.js` dosyasına yeni endpoint'ler eklendi
- `Ui/lib/api.ts` dosyasına `markAlertRead` fonksiyonu eklendi
- `Ui/lib/api.ts` dosyasına `updateInfluencerSocialAccount` fonksiyonu eklendi
- `Ui/lib/api.ts` dosyasına `deleteInfluencerSocialAccount` fonksiyonu eklendi
- `Ui/lib/api.ts` dosyasına `addInfluencerPaymentAccount` fonksiyonu eklendi
- `Ui/lib/api.ts` dosyasına `sendMessage` fonksiyonu eklendi
- `Ui/lib/api.ts` dosyasına `getUnreadAlerts` fonksiyonu eklendi
- `src/routes/codes.js` dosyasında sıralama düzeltmeleri yapıldı
- `src/routes/sale.js` dosyasında sıralama düzeltmeleri yapıldı
- `src/routes/payouts.js` dosyasında sıralama düzeltmeleri yapıldı
- `src/routes/sale.js` dosyasında satış listesi sıralama düzeltmesi yapıldı (datetime fonksiyonu kullanılarak)
- `src/routes/balance.js` dosyasında satış listesi sıralama düzeltmesi yapıldı (datetime fonksiyonu kullanılarak)
- `src/routes/commissions.js` dosyasında komisyon listesi sıralama düzeltmesi yapıldı (datetime fonksiyonu kullanılarak)
### Rotalardaki Değişiklikler

- Influencer paneli için yeni sosyal medya ve ödeme hesabı yönetimi rotaları eklendi
| `POST` | `/sale` | Bir indirim kodu kullanarak yeni bir satış kaydı oluşturur. | `src/routes/sale.js` |
| `POST` | `/alerts/:id/read` | Bir uyarıyı okundu olarak işaretler. | `src/routes/alerts.js` |
- Admin paneli için `/alerts/:id/read` rotası kullanıma açıldı
### 10 Kurala Uygunluk İçin Yapılan Değişiklikler

- API fonksiyonları ve endpoint'ler 10 kuralına uygun olarak güncellendi
- API fonksiyonları ve endpoint'ler 10 kuralına uygun olarak güncellendi (markAlertRead fonksiyonu dahil)
- Yeni eklenen API fonksiyonları (updateInfluencerSocialAccount, deleteInfluencerSocialAccount, addInfluencerPaymentAccount, sendMessage, getUnreadAlerts) 10 kuralına uygun olarak geliştirildi
- Admin panelindeki listeler için sıralama düzeltmeleri yapıldı (kodlar, ödemeler ve satışlar listesi)
| `GET` | `/codes/search/:code` | Bir indirim kodunun geçerli ve aktif olup olmadığını kontrol eder. | `src/routes/codes.js` |
| `GET` | `/contracts/active` | Sistemdeki mevcut aktif sözleşmeyi getirir. | `src/routes/contract.js` |

### Frontend Rotaları ve Dosyaları (Public)

- **Ana Sayfa / Başvuru Formu**: `Ui/app/page.tsx` ve `Ui/app/apply/page.tsx`
- **Şifremi Unuttum**: `Ui/app/forgot-password/page.tsx`
- **Şifre Sıfırlama**: `Ui/app/reset-password/page.tsx`

## Yapılan Düzeltmeler

- id'si 21 ve 42 olan influencer'lara ait ödeme kayıtlarının silinmesi işlemi
- Bu işlemin neden yapıldığı: Influencer'ların bulunmaması nedeniyle sakat ödeme kayıtları oluşmuş olması
- İşlem sonucunda dashboard'daki "Ödemesi yapılmış komisyon" değeri 1350 TL'den 1120 TL'ye düşmüştür

## Dosya/Dizin Yapısındaki Değişiklikler

- Yeni oluşturulan betik dosyaları:
 - check_influencer_status.js
 - check_payouts_status.js
 - delete_orphaned_payouts.js
 - login_admin.js
 - test_accounts.js
  - get-admin-summary.js

## Rotalardaki Değişiklikler

## 4. API İstekleri ve Proxy Yapılandırması

### Frontend API İstekleri
- `Ui/lib/api.ts` dosyasındaki `request` fonksiyonu güncellendi
- `/api/admin/` ile başlayan URL'ler artık Next.js proxy rotalarını kullanacak şekilde değiştirildi
- Bu sayede `/api/admin/sales` gibi istekler doğrudan backend'e değil, Next.js uygulamasındaki proxy rotasına yönlendiriliyor

### Backend Satış Erişimi
- `src/routes/sale.js` dosyasındaki `/api/sales` rotası güncellendi
- Admin kullanıcılar için tüm satışlara erişim sağlandı
- Influencer kullanıcılar için sadece kendi kodlarıyla yapılan satışlara erişim sağlandı
- Bu değişiklik, influencer'ların diğer influencer'ların satışlarını görmesini engelliyor
## 5. Ödeme ve Komisyon Hesaplamaları

### Admin Panel Bakiye Özet Hesaplamaları
- `src/routes/balance.js` dosyasındaki `/balance/admin-summary/summary` endpoint'i güncellendi
- "Ödemesi yapılmış" alanlar: Influencerlere yapılan ödemelerin toplamı ve bu ödemelerin karşıladığı satış tutarları olarak değiştirildi
- "Ödemesi yapılmamış" alanlar: Influencerların kazandığı ancak henüz ödenmemiş komisyonlar ve bu komisyonlara karşılık gelen ürün tutarları olarak değiştirildi
- Bu değişiklikle admin panelinde doğru ödeme ve komisyon bilgileri görüntülenmektedir
- Herhangi bir rota değişikliği yapılmadı, sadece veri düzeltmesi yapıldı

## 6. Yeni Eklenen Özellikler

### Influencer Detayı Hızlı Satış Formu Komisyon Alanı
- `Ui/app/admin/influencers/[id]/page.tsx` dosyasındaki `QuickSaleForm` bileşenine komisyon alanı eklendi
- Formda artık seçilen koda göre komisyon oranı, satış tutarı ve tahmini komisyon miktarı kullanıcıya daha belirgin şekilde gösteriliyor
- Komisyon hesaplaması gerçek zamanlı olarak yapılmaktadır
- Komisyon oranı, satış tutarı ve tahmini komisyon miktarı ayrı ayrı gösterilmektedir
- Görsel tasarım, kullanıcıya daha iyi bir deneyim sunmak için iyileştirilmiştir

## 7. Influencer Detayı Sayfası Geliştirmeleri

### Satış Listeleme Sorununun Giderilmesi
- `Ui/app/admin/influencers/[id]/page.tsx` dosyasında satışların doğru şekilde listelenmesi sağlandı
- API'den dönen satış verilerinin işlenmesi iyileştirildi
- Satış yoksa kullanıcıya "Henüz satış yapılmamış" mesajı gösterilir
- API hata durumları için daha i iyi kontrol mekanizmaları eklendi

### Bakiye Bilgileri Bölümü Ekleme
- Influencer detay sayfasına bakiye ve performans bilgileri bölümü eklendi
- `Ui/app/admin/influencers/[id]/page.tsx` dosyasına `getAdminInfluencerBalance` fonksiyonu entegre edildi
- Mevcut bakiye, toplam komisyon, ödenmiş komisyon, ödenmemiş komisyon, toplam satış ve son ödeme tarihi bilgileri gösterilir
- Bakiye hareketlerini gösteren ekstra bir bölüm eklendi
- Bakiye bilgileri `BalanceSummary` tipi ile tanımlandı ve doğru şekilde işlendi

## 8. Satış Filtreleme Güncellemesi

### Influencer ID Filtresi
- `src/routes/sale.js` dosyasında `/api/sales` endpoint'inde yapılan değişiklikle, artık admin kullanıcılar sadece kendi influencer ID'lerine göre satış filtrelemesi yapabiliyor.
- Influencer ID filtresi artık admin olup olmadığına bakmaksızın uygulanıyor.
- Bu değişiklik, admin panelinde influencer detay sayfasında yapılan satış listeleme işlemlerini düzeltiyor.
