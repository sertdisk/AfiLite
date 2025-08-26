# AfiLite Admin Web UI

Kısa açıklama: Next.js (App Router) + Tailwind CSS tabanlı basit Admin paneli. Login akışı backend AfiLite API'ye bağlanır, dönen JWT HttpOnly+Secure+SameSite=Strict cookie olarak saklanır ve sayfa/route handler katmanında doğrulanır.

## Özellikler
- Next.js App Router (TypeScript, ESLint açık)
- Tailwind CSS ile hızlı stil
- Login/Logout akışı (JWT cookie)
- Korumalı Dashboard sayfası (SSR yönlendirme)

## Geliştirme
1) Bağımlılıkları yükle:
   - `cd admin-ui`
   - `npm install`

2) Ortam değişkeni:
   - `.env.local` örneği:
     ```
     ADMIN_API_BASE_URL=http://localhost:3000/api/v1
     COOKIE_SECURE=false
     NODE_ENV=development
     ```

3) Çalıştır:
   - `npm run dev`
   - Uygulama: http://localhost:4000

Backend (AfiLite API) çalışır olmalıdır. Login denemesi başarılı olduğunda cookie set edilir ve `/dashboard` sayfasına yönlendirilir.

## Notlar
- Env değerleri `process.env` üzerinden okunur.
- Şimdilik sayfa bazında cookie kontrolü yapılmaktadır (middleware yok).