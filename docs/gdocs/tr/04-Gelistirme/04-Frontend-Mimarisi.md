# Geliştirme: Frontend Mimarisi

AfiLite'ın frontend uygulaması, modern web geliştirme standartlarına uygun olarak Next.js ve React kullanılarak geliştirilmiştir. Bu bölüm, frontend mimarisini, önemli bileşenleri, veri akışını ve stil yönetimini detaylandırmaktadır.

## 1. Genel Yapı ve Teknolojiler

*   **Next.js (App Router):** Frontend, Next.js'in yeni App Router yaklaşımını kullanır. Bu, sunucu bileşenleri (Server Components) ve istemci bileşenleri (Client Components) arasında daha esnek bir ayrım sağlar, performansı artırır ve geliştirme deneyimini iyileştirir.
*   **React:** Kullanıcı arayüzleri oluşturmak için temel kütüphane.
*   **TypeScript:** Kod kalitesini ve okunabilirliğini artıran, hata yakalamayı kolaylaştıran tip güvenli bir geliştirme ortamı sunar.
*   **Tailwind CSS:** Hızlı ve tutarlı arayüzler oluşturmak için "utility-first" bir CSS çerçevesidir. Bileşenlerin stilini doğrudan JSX içinde tanımlamamızı sağlar.

## 2. Dizin Yapısı (`Ui/app`)

Frontend uygulaması, Next.js'in önerdiği App Router dizin yapısını takip eder:

*   **`app/`:** Tüm rota tabanlı bileşenleri ve layout'ları içerir.
    *   **`layout.tsx`:** Uygulamanın ana layout'u. Global CSS, header, footer gibi tüm sayfalarda ortak olan elementleri içerir.
    *   **`page.tsx`:** Bir rotanın ana UI bileşeni.
    *   **`(protected)/`:** Kimlik doğrulaması gerektiren sayfaları gruplamak için kullanılan bir klasör. Bu klasör, URL yapısını etkilemez.
    *   **`admin/`:** Admin paneline ait sayfaları ve bileşenleri içerir.
    *   **`influencer/`:** Influencer paneline ait sayfaları ve bileşenleri içerir.
    *   **`api/`:** Next.js API rotalarını içerir. Backend API'sine proxy görevi görebilir veya doğrudan sunucu tarafı mantığı içerebilir.
    *   **`_components/`:** Yeniden kullanılabilir UI bileşenlerini içerir.
*   **`lib/`:** Yardımcı fonksiyonları, API servislerini ve diğer genel amaçlı modülleri içerir.
    *   **`api.ts`:** Backend API'si ile etkileşimi sağlayan fonksiyonları içerir. `fetch` çağrılarını ve hata yönetimini merkezi hale getirir.
    *   **`auth.ts`:** Kimlik doğrulama ile ilgili yardımcı fonksiyonları içerir.
*   **`styles/`:** Global CSS dosyalarını içerir (örneğin, `globals.css`).

## 3. Veri Akışı ve API Etkileşimi

Frontend uygulaması, backend ile `lib/api.ts` içinde tanımlanan fonksiyonlar aracılığıyla etkileşime girer. Bu fonksiyonlar, `fetch` API'sini kullanarak backend endpoint'lerine istek gönderir.

*   **Next.js Proxy:** `next.config.js` dosyasında tanımlanan `rewrites` kuralları sayesinde, `/api` ile başlayan istekler doğrudan backend sunucusuna yönlendirilir. Bu, CORS sorunlarını önler ve geliştirme sürecini basitleştirir.
*   **İstemci Tarafı Veri Çekme:** Çoğu veri çekme işlemi, `useEffect` hook'ları içinde veya olay işleyicilerinde istemci tarafında gerçekleşir.

## 4. Stil Yönetimi

Frontend, arayüz stilini yönetmek için Tailwind CSS kullanır. `globals.css` dosyası, Tailwind'in temel stillerini ve özel global stilleri içerir.

*   **Utility-First Yaklaşım:** Bileşenlerin stilleri, doğrudan JSX içinde Tailwind sınıfları kullanılarak tanımlanır.
*   **`@tailwindcss/typography` (Prose):** Özellikle sözleşme metinleri gibi zengin metin içeriklerinin okunabilirliğini artırmak için `prose` sınıfı kullanılır. Bu eklenti, HTML içeriğini otomatik olarak güzel bir tipografi ile biçimlendirir.

## 5. Önemli Bileşenler ve Desenler

*   **Client Components (`'use client'`):** Etkileşimli UI mantığı, state yönetimi ve `useEffect` gibi hook'lar gerektiren bileşenler için kullanılır.
*   **Server Components (Varsayılan):** Veri çekme ve sunucu tarafı mantığı için kullanılır. Performansı artırır ve bundle boyutunu küçültür.
*   **State Yönetimi:** React'ın `useState` ve `useReducer` hook'ları ile yerel bileşen durumu yönetilir. Global durum yönetimi için (eğer gerekliyse) React Context API veya üçüncü taraf kütüphaneler kullanılabilir.

Bu mimari, AfiLite frontend'inin hızlı, bakımı kolay ve geliştirilebilir olmasını sağlar. Geliştiriciler, bu yapıyı anlayarak projeye daha etkin bir şekilde katkıda bulunabilirler.
