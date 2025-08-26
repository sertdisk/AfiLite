# AfiLite Backend API Dokümantasyonu

## Genel Bilgiler

- **Base URL**: `https://api.afilite.com/api/v1`
- **Protokol**: HTTPS
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 istek/dakika (Redis tabanlı)

## Kimlik Doğrulama

### Admin Login
```http
POST /api/v1/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Token Doğrulama
```http
GET /api/v1/verify
Authorization: Bearer {token}
```

## Endpoint'ler

### 1. Influencer Başvuruları

#### Başvuru Oluştur
```http
POST /api/v1/apply
Content-Type: application/json

{
  "full_name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "+905551234567",
  "social_media": ["instagram.com/ahmetyilmaz", "tiktok.com/@ahmetyilmaz"],
  "followers": 15000,
  "iban": "TR330006100519786457841326",
  "tax_type": "individual",
  "about": "Moda ve lifestyle içerik üreticisiyim...",
  "message": "AfiLite ile çalışmak istiyorum"
}
```

**Response:**
```json
{
  "message": "Başvurunuz başarıyla alındı",
  "influencer_id": 123
}
```

#### Tüm Başvuruları Listele (Admin)
```http
GET /api/v1/apply
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "influencers": [
    {
      "id": 123,
      "full_name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Başvuru Durumu Güncelle (Admin)
```http
PATCH /api/v1/apply/{influencer_id}/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "approved"
}
```

### 2. İndirim Kodları

#### Kod Oluştur (Admin)
```http
POST /api/v1/codes
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "AHMET15",
  "discount_percentage": 15,
  "influencer_id": 123
}
```

#### Tüm Kodları Listele (Admin)
```http
GET /api/v1/codes
Authorization: Bearer {admin_token}
```

#### Kod Detayları (Admin)
```http
GET /api/v1/codes/{code_id}
Authorization: Bearer {admin_token}
```

#### Kod Güncelle (Admin)
```http
PUT /api/v1/codes/{code_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "AHMET20",
  "discount_percentage": 20
}
```

#### Kod Sil (Admin)
```http
DELETE /api/v1/codes/{code_id}
Authorization: Bearer {admin_token}
```

### 3. Satış İşlemleri

#### Satış Kaydet
```http
POST /api/v1/sale
Content-Type: application/json

{
  "code": "AHMET15",
  "total_amount": 150.00
}
```

**Response:**
```json
{
  "message": "Satış kaydedildi",
  "sale_id": 456,
  "commission": 22.50
}
```

#### Tüm Satışları Listele (Admin)
```http
GET /api/v1/sales
Authorization: Bearer {admin_token}
```

#### Satış İstatistikleri (Admin)
```http
GET /api/v1/sales/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "stats": {
    "total_sales": 1250,
    "total_revenue": 187500.00,
    "total_commission": 28125.00,
    "average_order_value": 150.00
  }
}
```

### 4. Bakiye ve Komisyonlar

#### Influencer Bakiyesi
```http
GET /api/v1/balance/{influencer_id}
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "balance": {
    "total_earnings": 2812.50,
    "pending_earnings": 450.00,
    "paid_earnings": 2362.50,
    "currency": "TRY"
  }
}
```

#### Bakiye Geçmişi
```http
GET /api/v1/balance/{influencer_id}/history
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "history": [
    {
      "id": 789,
      "type": "commission",
      "amount": 22.50,
      "description": "Satış komisyonu - Sipariş #456",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

## Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Bad Request - Geçersiz parametreler |
| 401 | Unauthorized - Token gerekli veya geçersiz |
| 403 | Forbidden - Yetkisiz erişim |
| 404 | Not Found - Kaynak bulunamadı |
| 429 | Too Many Requests - Rate limit aşıldı |
| 500 | Internal Server Error - Sunucu hatası |

## Rate Limiting

- **Standart limit**: 100 istek/dakika
- **Login endpoint**: 5 istek/dakika
- **Satış kaydetme**: 50 istek/dakika

## Test ve Geliştirme

### Test Komutları
```bash
# Tüm testleri çalıştır
npm test

# Load test (1000 kullanıcı)
npm run test:load

# Testleri izleme modunda çalıştır
npm run test:watch
```

### Coverage Raporu
Test coverage hedefi: %80+
- Branches: %80+
- Functions: %80+
- Lines: %80+
- Statements: %80+

## Güvenlik

- **HTTPS**: Tüm istekler HTTPS üzerinden
- **SSL**: Let's Encrypt sertifikaları
- **JWT**: JSON Web Token tabanlı authentication
- **Rate Limiting**: Redis tabanlı rate limiting
- **Input Validation**: Tüm parametreler doğrulanır
- **SQL Injection**: Knex.js ile parametreli sorgular

## Örnek Postman Koleksiyonu

Postman koleksiyonu: `AfiLite_API.postman_collection.json`

## Versiyonlama

- **Current Version**: v1
- **Base URL**: `/api/v1`
- **Backward Compatibility**: Yeni versiyonlar için ayrı endpoint'ler