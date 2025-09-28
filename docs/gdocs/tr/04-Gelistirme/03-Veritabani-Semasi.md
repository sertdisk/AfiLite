# Geliştirme: Veritabanı Şeması

AfiLite, veri depolama için SQLite kullanır ve Knex.js ile yönetilen bir veritabanı şemasına sahiptir. Bu bölümde, projenin temel tabloları, sütunları ve aralarındaki ilişkiler detaylı olarak açıklanmaktadır.

## Veritabanı Tasarım Felsefesi

Veritabanı tasarımı, basitlik, performans ve esneklik prensipleri üzerine kurulmuştur. İlişkisel bir yapı kullanılarak veri tutarlılığı sağlanırken, gereksiz karmaşıklıktan kaçınılmıştır. Tüm tarih/zaman bilgileri `YYYY-MM-DD HH:MM:SS` formatında saklanır.

## Temel Tablolar

### 1. `influencers` Tablosu

Influencer'ların ve admin kullanıcıların temel bilgilerini depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz Influencer/Admin ID'si |
| `full_name` | `TEXT` | `NOT NULL` | Influencer'ın tam adı |
| `tax_type` | `TEXT` | `NOT NULL`, `ENUM('individual', 'company')` | Vergi mükellefiyet tipi |
| `phone` | `TEXT` | `NOT NULL` | Telefon numarası |
| `email` | `TEXT` | `NOT NULL`, `UNIQUE` | E-posta adresi (benzersiz) |
| `social_media` | `TEXT` | `NULLABLE` | Sosyal medya linkleri (JSON string olarak) |
| `about` | `TEXT` | `NULLABLE` | Influencer hakkında kısa bilgi |
| `message` | `TEXT` | `NULLABLE` | Influencer'ın mesajı |
| `status` | `TEXT` | `DEFAULT 'pending'`, `ENUM('pending', 'approved', 'rejected', 'suspended')` | Başvuru/Hesap durumu |
| `followers` | `INTEGER` | `DEFAULT 0` | Takipçi sayısı |
| `password_hash` | `TEXT` | `NULLABLE` | Şifrenin hash değeri |
| `role` | `TEXT` | `DEFAULT 'influencer'`, `ENUM('admin', 'influencer')` | Kullanıcı rolü |
| `brand_name` | `TEXT` | `NULLABLE` | Influencer'ın marka adı |
| `notes` | `TEXT` | `NULLABLE` | Admin notları |
| `password_reset_token` | `TEXT` | `NULLABLE` | Şifre sıfırlama token'ı |
| `password_reset_expires_at` | `DATETIME` | `NULLABLE` | Şifre sıfırlama token'ının geçerlilik süresi |
| `terms_accepted` | `BOOLEAN` | `DEFAULT FALSE` | Kullanım koşulları kabul edildi mi? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Kayıt tarihi |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Son güncelleme tarihi |

### 2. `discount_codes` Tablosu

Influencer'lara özel indirim kodlarını depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz Kod ID'si |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Kodu oluşturan Influencer ID'si |
| `code` | `TEXT` | `NOT NULL`, `UNIQUE` | İndirim kodu (benzersiz) |
| `discount_pct` | `INTEGER` | `NOT NULL`, `CHECK (1-100)` | Müşteriye uygulanan indirim yüzdesi |
| `commission_pct` | `INTEGER` | `NOT NULL`, `CHECK (1-100)` | Influencer'a ödenen komisyon yüzdesi |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Kod aktif mi? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Oluşturulma tarihi |

### 3. `sales` Tablosu

İndirim kodları aracılığıyla gerçekleşen satışları depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz Satış ID'si |
| `code` | `TEXT` | `NOT NULL`, `FOREIGN KEY (discount_codes.code)` | Kullanılan indirim kodu |
| `total_amount` | `REAL` | `NOT NULL` | Satışın toplam tutarı |
| `commission` | `REAL` | `NOT NULL` | Influencer'a ödenen komisyon tutarı |
| `customer_url` | `TEXT` | `NULLABLE` | Müşterinin yönlendirildiği URL |
| `product` | `TEXT` | `NULLABLE` | Satılan ürünün adı |
| `note` | `TEXT` | `NULLABLE` | Satışla ilgili notlar |
| `recorded_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Satışın kaydedildiği tarih/saat |

### 4. `payouts` Tablosu

Influencer'lara yapılan ödemeleri depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz Ödeme ID'si |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Ödemenin yapıldığı Influencer ID'si |
| `amount` | `REAL` | `NOT NULL` | Ödeme tutarı |
| `status` | `TEXT` | `NOT NULL`, `ENUM('pending', 'completed', 'cancelled')` | Ödeme durumu |
| `iban` | `TEXT` | `NULLABLE` | Ödemenin yapıldığı IBAN |
| `note` | `TEXT` | `NULLABLE` | Ödeme ile ilgili notlar |
| `balance_before` | `REAL` | `NULLABLE` | Ödeme öncesi bakiye |
| `balance_after` | `REAL` | `NULLABLE` | Ödeme sonrası bakiye |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Oluşturulma tarihi |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Son güncelleme tarihi |

### 5. `contracts` Tablosu

Influencer'lar ile yapılan sözleşmelerin versiyonlarını depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz Sözleşme ID'si |
| `content` | `TEXT` | `NOT NULL` | Sözleşme içeriği (Markdown veya düz metin) |
| `version` | `INTEGER` | `NOT NULL`, `UNIQUE` | Sözleşme versiyon numarası |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT FALSE` | Sözleşme aktif mi? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Oluşturulma tarihi |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Son güncelleme tarihi |

### 6. `influencer_social_accounts` Tablosu

Influencer'ların sosyal medya hesaplarını depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Influencer ID'si |
| `platform` | `TEXT` | `NOT NULL` | Sosyal medya platformu (Instagram, YouTube vb.) |
| `username` | `TEXT` | `NOT NULL` | Kullanıcı adı/kanal adı |
| `address` | `TEXT` | `NULLABLE` | Profil linki |
| `niche` | `TEXT` | `NULLABLE` | Influencer'ın nişi |
| `role` | `TEXT` | `NULLABLE` | Influencer'ın platformdaki rolü |
| `followers` | `INTEGER` | `DEFAULT 0` | Takipçi sayısı |
| `avgViews` | `INTEGER` | `DEFAULT 0` | Ortalama izlenme sayısı |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Hesap aktif mi? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Oluşturulma tarihi |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Son güncelleme tarihi |

### 7. `influencer_payment_accounts` Tablosu

Influencer'ların ödeme hesaplarını depolar.

| Sütun Adı | Veri Tipi | Kısıtlamalar | Açıklama |
| :-------- | :-------- | :---------- | :-------- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Benzersiz ID |
| `influencer_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY (influencers.id)` | Influencer ID'si |
| `bank_name` | `TEXT` | `NOT NULL` | Banka adı |
| `account_holder_name` | `TEXT` | `NOT NULL` | Hesap sahibi adı |
| `iban` | `TEXT` | `NOT NULL` | IBAN numarası |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Hesap aktif mi? |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Oluşturulma tarihi |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Son güncelleme tarihi |

Bu şema, AfiLite platformunun tüm temel veri ihtiyaçlarını karşılamak üzere tasarlanmıştır. Knex.js migration dosyaları aracılığıyla kolayca yönetilebilir ve genişletilebilir.
