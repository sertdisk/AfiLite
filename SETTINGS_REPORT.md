# Admin Ayarlar Bölümü Geliştirme Raporu

## 1. Mevcut Durum Analizi

### 1.1. Mevcut Ayarlar
Şu anda admin ayarlar sayfasında iki temel ayar bulunuyor:
1. **Komisyon/İndirim Oran Ayarlama**: Tüm influencer kodlarının komisyon oranlarını topluca güncelleme
2. **Sözleşme Yönetimi**: Yeni sözleşme versiyonu oluşturma ve mevcut sözleşmeleri görüntüleme

### 1.2. Veritabanı Yapısı
Projede şu tablolar mevcut:
- `influencers`: Influencer bilgileri
- `discount_codes`: İndirim kodları ve komisyon oranları
- `sales`: Satış kayıtları
- `contracts`: Sözleşme versiyonları
- `payouts`: Ödeme kayıtları
- `system_alerts`: Sistem uyarıları
- `messages`: Mesajlaşma sistemi
- `influencer_social_accounts`: Influencer sosyal medya hesapları
- `influencer_payment_accounts`: Influencer ödeme hesapları

## 2. Önerilen Yeni Ayarlar Bölümleri

### 2.1. Sistem Genel Ayarları
**Amaç**: Uygulamanın genel davranışını ve görünümünü kontrol etmek

**Özellikler**:
- Uygulama adı ve açıklaması
- Logo yükleme
- Tema renkleri (ana renk, ikincil renk)
- Varsayılan dil ayarı
- Zaman dilimi ayarı
- Bakım modu
- Güvenlik ayarları (SSL zorunluluğu, CORS ayarları)

### 2.2. Güvenlik ve Kimlik Doğrulama Ayarları
**Amaç**: Uygulamanın güvenlik seviyesini yönetmek

**Özellikler**:
- Parola karmaşıklık kuralları
- Oturum süresi ayarları
- İki faktörlü kimlik doğrulama (2FA) zorunluluğu
- Rate limiting ayarları (IP bazlı, kullanıcı bazlı)
- IP engelleme listesi
- Otomatik hesap kilitleme ayarları
- CAPTCHA ayarları

### 2.3. E-posta ve Bildirim Ayarları
**Amaç**: Sistem bildirimlerinin ve e-postaların yönetimini sağlamak

**Özellikler**:
- SMTP sunucu ayarları
- E-posta şablonları (onay, reddetme, ödeme bildirimi vb.)
- Bildirim tercihleri (e-posta, SMS, push notification)
- Otomatik bildirim kuralları
- Bildirim zamanlaması
- Gönderen e-posta adresi ve adı

### 2.4. Influencer Onay ve Yönetim Ayarları
**Amaç**: Influencer başvurularının değerlendirilme kurallarını belirlemek

**Özellikler**:
- Otomatik onay kuralları (minimum takipçi sayısı, profil tamamlama yüzdesi)
- Manuel inceleme gerekli mi?
- Reddetme sebepleri şablonları
- Influencer durum geçiş kuralları
- Influencer kategorileri/niche yönetimi
- Influencer seviye sistemi (bronze, silver, gold)

### 2.5. Satış ve Komisyon Ayarları
**Amaç**: Satış işleme ve komisyon hesaplama kurallarını yönetmek

**Özellikler**:
- Varsayılan komisyon oranı
- Varsayılan indirim yüzdesi
- Minimum/maximum komisyon sınırları
- Komisyon hesaplama yöntemi (net satış, brüt satış)
- Satış doğrulama kuralları
- Sahte satış tespiti ayarları
- Satış iptal/iade komisyon politikası
- Komisyon ödeme zamanlaması

### 2.6. Ödeme ve Fatura Ayarları
**Amaç**: Ödeme işlemlerinin ve fatura düzenlemelerinin yönetimini sağlamak

**Özellikler**:
- Ödeme yöntemleri (banka transferi, PayPal, Stripe vb.)
- Ödeme zamanlaması (haftalık, aylık, manuel)
- Minimum ödeme limiti
- Ödeme kesinti oranları
- Fatura oluşturma ayarları
- Vergi hesaplama kuralları
- Para birimi ayarları

### 2.7. Entegrasyon Ayarları
**Amaç**: Harici sistemlerle entegrasyonları yönetmek

**Özellikler**:
- E-ticaret platformu entegrasyonları (API key, secret)
- Sosyal medya API ayarları
- Ödeme sistemi entegrasyonları
- Analytics entegrasyonları (Google Analytics, Facebook Pixel)
- CRM entegrasyon ayarları

### 2.8. Raporlama ve Analiz Ayarları
**Amaç**: Sistem raporlarının ve analizlerin yapılandırmasını sağlamak

**Özellikler**:
- Varsayılan rapor zamanlamaları
- Rapor format tercihleri (PDF, Excel, CSV)
- Otomatik rapor gönderimi ayarları
- Metrik tanımları
- KPI ayarları
- Dashboard widget ayarları

### 2.9. Mesajlaşma ve İletişim Ayarları
**Amaç**: Kullanıcılar arası iletişim kurallarını yönetmek

**Özellikler**:
- Mesajlaşma politikaları
- Otomatik yanıtlayıcı ayarları
- Spam filtre ayarları
- Mesaj boyut sınırları
- Dosya paylaşım ayarları
- Grup mesajlaşma ayarları

### 2.10. Yedekleme ve Bakım Ayarları
**Amaç**: Sistem verilerinin korunmasını ve bakım işlemlerinin yönetimini sağlamak

**Özellikler**:
- Otomatik yedekleme zamanlaması
- Yedekleme saklama süresi
- Yedekleme konumu ayarları
- Bakım penceresi ayarları
- Günlük dosyası saklama süresi
- Performans monitör ayarları

## 3. Önceliklendirme Önerisi

### 3.1. Yüksek Öncelikli Ayarlar
1. **Güvenlik ve Kimlik Doğrulama Ayarları**
2. **E-posta ve Bildirim Ayarları**
3. **Satış ve Komisyon Ayarları**
4. **Influencer Onay ve Yönetim Ayarları**

### 3.2. Orta Öncelikli Ayarlar
1. **Sistem Genel Ayarları**
2. **Ödeme ve Fatura Ayarları**
3. **Mesajlaşma ve İletişim Ayarları**
4. **Raporlama ve Analiz Ayarları**

### 3.3. Düşük Öncelikli Ayarlar
1. **Entegrasyon Ayarları**
2. **Yedekleme ve Bakım Ayarları**

## 4. Teknik Uygulama Önerileri

### 4.1. Veritabanı Tasarımı
```sql
-- Ayarlar tablosu önerisi
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category VARCHAR(50) NOT NULL, -- 'security', 'email', 'commission' vb.
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2. API Endpoint Yapısı
```
GET    /api/admin/settings              - Tüm ayarları listele
GET    /api/admin/settings/{category}   - Kategoriye göre ayarları listele
PUT    /api/admin/settings/{key}        - Belirli bir ayarı güncelle
PATCH  /api/admin/settings              - Birden fazla ayarı toplu güncelle
```

### 4.3. Frontend Bileşen Yapısı
```
AdminSettingsPage
├── SecuritySettings
├── EmailNotificationSettings
├── CommissionSettings
├── InfluencerManagementSettings
├── PaymentSettings
└── GeneralSettings
```

## 5. Sonuç ve Öneriler

Mevcut admin ayarlar sayfası iyi bir temel oluşturmuş durumda. Komisyon oran ayarlama ve sözleşme yönetimi gibi temel işlevler zaten uygulanmış. Ancak sistem genelinde daha kapsamlı ayarlar yönetimi için aşağıdaki adımlar önerilir:

1. **Önce Yüksek Öncelikli Ayarları Ekleyin**: Özellikle güvenlik ve e-posta ayarları, sistemin kararlı çalışması için kritik öneme sahip.

2. **Modüler Yapı Kullanın**: Her ayar kategorisini ayrı bileşenler halinde geliştirin böylece bakım kolaylaşır.

3. **Varsayılan Değerler Belirleyin**: Kullanıcıların hızlıca başlayabilmesi için makul varsayılan ayarlar sağlayın.

4. **Validasyon Ekleyin**: Ayar değerlerinin geçerliliğini kontrol eden doğrulama kuralları ekleyin.

5. **Loglama ve Geçmiş Tutun**: Ayar değişikliklerinin kim tarafından ve ne zaman yapıldığını kaydedin.

Bu geliştirme ile admin panel daha kapsamlı ve esnek hale gelecek, sistemin yönetimi kolaylaşacaktır.