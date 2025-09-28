# Hızlı Kurulum (Geliştiriciler İçin)

Bu bölüm, AfiLite'ı hızlıca kurup çalıştırmak isteyen geliştiriciler için tasarlanmıştır. Eğer detaylı, adım adım bir rehber arıyorsanız, lütfen [Adım Adım Kurulum](./03-Adim-Adim-Kurulum.md) bölümüne göz atın.

## Önkoşullar

Kuruluma başlamadan önce aşağıdaki gereksinimleri karşıladığınızdan emin olun:

-   [Node.js (v18.x veya üzeri)](./01-Gereksinimler.md#nodejs)
-   [Git](./01-Gereksinimler.md#git)
-   [Metin Düzenleyici / IDE](./01-Gereksinimler.md#metin-düzenleyici--ide)

## Kurulum Adımları

1.  **Depoyu Klonlayın:**
    ```bash
    git clone https://github.com/your-username/AfiLite.git
    cd AfiLite
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    cd Ui
    npm install
    cd ..
    ```

3.  **Ortam Değişkenlerini Yapılandırın:**
    *   Projenin kök dizininde `example.env` dosyasını `cp example.env .env` komutuyla `.env` olarak kopyalayın.
    *   `.env` dosyasını açın ve `JWT_SECRET` gibi gerekli değişkenleri kendi değerlerinizle güncelleyin. Detaylar için [Ortam Değişkenleri](./01-Gereksinimler.md#ortam-değişkenleri) bölümüne bakın.

4.  **Veritabanını Hazırlayın:**
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
    Bu komutlar, veritabanı şemasını oluşturacak ve başlangıç verilerini (örneğin bir admin kullanıcısı) ekleyecektir.

5.  **Uygulamayı Başlatın:**
    *   **Backend'i Başlatın:**
        ```bash
        npm run dev
        ```
        Backend sunucusu varsayılan olarak `http://localhost:5003` adresinde çalışacaktır.

    *   **Frontend'i Başlatın:**
        ```bash
        cd Ui
        npm run dev
        ```
        Frontend uygulaması varsayılan olarak `http://localhost:4000` adresinde çalışacaktır.

## İlk Çalıştırma ve Test

Uygulamaları başlattıktan sonra:

1.  Tarayıcınızda `http://localhost:4000` adresine gidin.
2.  Admin paneline `http://localhost:4000/admin/login` adresinden erişebilirsiniz.
    *   **Varsayılan Admin Bilgileri:** `admin@afi.com` / `123456`
3.  Influencer paneline `http://localhost:4000/login` adresinden erişebilirsiniz.
    *   **Varsayılan Influencer Bilgileri:** `inf1@test.com` / `123456` (Kod: `TESTQUFDLE`)

Artık AfiLite sistemini kullanmaya hazırsınız! Herhangi bir sorunla karşılaşırsanız, lütfen [Katkı Rehberi](./04-Gelistirme/01-Katki-Rehberi.md) bölümündeki hata ayıklama ipuçlarına göz atın veya bir GitHub Issue açın.
