# Geliştirme: API Referansı

AfiLite, hem başlı (headful) arayüzü desteklemek hem de başsız (headless) entegrasyonlara olanak tanımak için kapsamlı bir RESTful API sunar. Bu bölüm, backend API'mizin temel endpoint'lerini, istek ve yanıt formatlarını detaylandırmaktadır.

## API Temel Bilgileri

*   **Temel URL:** `http://localhost:5003/api/v1` (Geliştirme ortamı için)
*   **Kimlik Doğrulama:** Çoğu endpoint için JWT (JSON Web Token) tabanlı kimlik doğrulama gereklidir. Token, `Authorization: Bearer <token>` başlığı ile gönderilmelidir.
*   **Hata Yanıtları:** API, hata durumlarında standart HTTP durum kodları ve `json({ error: "Hata mesajı" })` formatında yanıtlar döner.

## Endpoint'ler

### 1. Kimlik Doğrulama (Auth)

*   **`POST /auth/admin/login`**
    *   **Açıklama:** Admin kullanıcısı için giriş yapar ve JWT token döndürür.
    *   **İstek Gövdesi:** `{ email: string, password: string }`
    *   **Yanıt:** `{ message: string, token: string, user: { id: number, email: string, role: string } }`

*   **`POST /auth/influencer/login`**
    *   **Açıklama:** Influencer kullanıcısı için giriş yapar ve JWT token döndürür.
    *   **İstek Gövdesi:** `{ email: string, password: string }`
    *   **Yanıt:** `{ message: string, token: string, user: { id: number, email: string, role: string, full_name: string } }`

*   **`GET /auth/verify`**
    *   **Açıklama:** Mevcut JWT token'ın geçerliliğini kontrol eder.
    *   **Kimlik Doğrulama:** Gerekli
    *   **Yanıt:** `{ valid: boolean, user: { id: number, email: string, role: string } }`

### 2. Influencer Yönetimi (Admin)

*   **`GET /influencers`**
    *   **Açıklama:** Tüm influencer'ları listeler. Sayfalama, arama ve sıralama destekler.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **Query Parametreleri:** `page`, `limit`, `search`, `start_date`, `end_date`, `sortBy`, `sortOrder`
    *   **Yanıt:** `{ items: Influencer[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`GET /influencers/:id`**
    *   **Açıklama:** Belirli bir influencer'ın detaylarını getirir.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **Yanıt:** `Influencer` nesnesi

*   **`PATCH /influencers/:id`**
    *   **Açıklama:** Bir influencer'ın bilgilerini günceller.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **İstek Gövdesi:** `{ full_name?: string, email?: string, brand_name?: string, status?: string, notes?: string }`
    *   **Yanıt:** Güncellenmiş `Influencer` nesnesi

### 3. Satış Yönetimi

*   **`POST /sale`**
    *   **Açıklama:** Yeni bir satış kaydı oluşturur. (Public endpoint)
    *   **İstek Gövdesi:** `{ code: string, total_amount: number, customer_url?: string, product?: string, note?: string }`
    *   **Yanıt:** `{ message: string, sale_id: number, sale: Sale }`

*   **`GET /sales`**
    *   **Açıklama:** Tüm satışları listeler. Sayfalama ve filtreleme destekler.
    *   **Kimlik Doğrulama:** Gerekli (Admin veya Influencer)
    *   **Query Parametreleri:** `page`, `limit`, `code`, `start_date`, `end_date`, `influencerId`
    *   **Yanıt:** `{ items: Sale[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`PATCH /sales/:id`**
    *   **Açıklama:** Bir satış kaydını günceller.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **İstek Gövdesi:** `{ total_amount?: number, customer_url?: string, product?: string, note?: string }`
    *   **Yanıt:** Güncellenmiş `Sale` nesnesi

### 4. Kod Yönetimi

*   **`POST /codes`**
    *   **Açıklama:** Yeni bir indirim kodu oluşturur.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **İstek Gövdesi:** `{ influencer_id: number, code: string, discount_percentage: number, commission_pct: number }`
    *   **Yanıt:** Yeni `Code` nesnesi

*   **`GET /codes/influencer/:id`**
    *   **Açıklama:** Belirli bir influencer'a ait tüm kodları listeler.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **Yanıt:** `{ codes: Code[] }`

*   **`GET /codes/my`**
    *   **Açıklama:** Giriş yapmış influencer'a ait tüm kodları listeler.
    *   **Kimlik Doğrulama:** Influencer gerekli
    *   **Yanıt:** `{ items: Code[] }`

### 5. Ödeme Yönetimi

*   **`GET /payouts`**
    *   **Açıklama:** Tüm ödeme kayıtlarını listeler. Sayfalama ve filtreleme destekler.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **Query Parametreleri:** `page`, `limit`, `influencer_id`, `start_date`, `end_date`, `status`
    *   **Yanıt:** `{ items: Payout[], pagination: { total: number, page: number, limit: number, pages: number } }`

*   **`POST /payouts`**
    *   **Açıklama:** Yeni bir ödeme kaydı oluşturur.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **İstek Gövdesi:** `{ influencer_id: number, amount: number, iban: string, note?: string, status?: string }`
    *   **Yanıt:** Yeni `Payout` nesnesi

### 6. Sözleşme Yönetimi

*   **`GET /contracts/active`**
    *   **Açıklama:** Aktif olan sözleşme versiyonunu getirir.
    *   **Yanıt:** `Contract` nesnesi

*   **`GET /contracts`**
    *   **Açıklama:** Tüm sözleşme versiyonlarını listeler.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **Yanıt:** `Contract[]`

*   **`POST /contracts`**
    *   **Açıklama:** Yeni bir sözleşme versiyonu oluşturur ve aktif hale getirir.
    *   **Kimlik Doğrulama:** Admin gerekli
    *   **İstek Gövdesi:** `{ content: string }`
    *   **Yanıt:** Yeni `Contract` nesnesi

Bu referans, AfiLite API'si ile entegrasyon yaparken size yol gösterecektir. Daha fazla detay için backend kodunu inceleyebilirsiniz.
