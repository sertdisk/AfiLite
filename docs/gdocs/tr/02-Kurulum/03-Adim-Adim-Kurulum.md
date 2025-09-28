# Adım Adım Kurulum

Bu bölüm, AfiLite'ı sıfırdan kurmak isteyen herkes için detaylı ve adım adım bir rehber sunar. Yazılım bilgisi olmayan kullanıcıların bile bu adımları takip ederek başarılı bir kurulum yapabilmesi hedeflenmiştir.

## 1. Önkoşulları Kontrol Edin

Kuruluma başlamadan önce, sisteminizde gerekli tüm yazılımların yüklü olduğundan emin olun. Detaylı bilgi için lütfen [Kurulum Gereksinimleri](../01-Gereksinimler.md) bölümünü inceleyin.

-   **Node.js (v18.x veya üzeri)**
-   **Git**
-   **Metin Düzenleyici / IDE** (Örn: VS Code)

## 2. Proje Dosyalarını İndirin

Proje dosyalarını GitHub deposundan bilgisayarınıza klonlayın. Terminalinizi açın ve aşağıdaki komutları çalıştırın:

```bash
# Depoyu klonlayın
git clone https://github.com/your-username/AfiLite.git

# Proje dizinine girin
cd AfiLite
```

## 3. Bağımlılıkları Yükleyin

AfiLite projesi hem backend hem de frontend için ayrı bağımlılıklara sahiptir. Her iki tarafın bağımlılıklarını da yüklemeniz gerekmektedir.

```bash
# Backend bağımlılıklarını yükleyin
npm install

# Frontend dizinine geçin
cd Ui

# Frontend bağımlılıklarını yükleyin
npm install

# Tekrar proje kök dizinine dönün
cd ..
```

## 4. Ortam Değişkenlerini Yapılandırın

AfiLite, yapılandırma ayarlarını ve hassas bilgileri `.env` dosyası aracılığıyla yönetir. Bu dosyayı oluşturmanız ve gerekli değişkenleri tanımlamanız gerekmektedir.

1.  **`.env` Dosyasını Oluşturun:** Projenin kök dizininde (`AfiLite` klasörünün içinde) `example.env` adında bir dosya bulunmaktadır. Bu dosyayı kopyalayarak `.` (nokta) ile başlayan `.env` adında yeni bir dosya oluşturun.
    ```bash
    cp example.env .env
    ```

2.  **`.env` Dosyasını Düzenleyin:** Oluşturduğunuz `.env` dosyasını bir metin düzenleyici (örneğin VS Code) ile açın ve aşağıdaki değişkenleri kendi ortamınıza göre güncelleyin:

    *   `PORT`: Backend sunucusunun çalışacağı port numarası. Varsayılan `5003` olarak ayarlanmıştır.
    *   `JWT_SECRET`: JWT (JSON Web Token) imzalamak için kullanılan gizli bir anahtardır. **Çok önemlidir!** Güçlü ve rastgele bir karakter dizisi kullanın. Örneğin, `openssl rand -hex 32` komutuyla rastgele bir anahtar oluşturabilirsiniz.
    *   `CORS_ORIGINS`: Frontend uygulamanızın çalıştığı URL'leri belirtir. Birden fazla URL varsa virgülle ayırın (örneğin: `http://localhost:3000,http://localhost:4000`). Varsayılan olarak `http://localhost:4000` ayarlanmıştır.
    *   `NEXT_PUBLIC_ADMIN_API_BASE_URL` ve `NEXT_PUBLIC_INFLUENCER_API_BASE_URL`: Frontend'in backend API'sine istek atarken kullanacağı temel URL'lerdir. Genellikle backend sunucusunun adresi (`http://localhost:5003`) olarak ayarlanır.

    **Örnek `.env` içeriği:**
    ```dotenv
    PORT=5003
    JWT_SECRET="sizin-cok-gizli-ve-guclu-anahtariniz-buraya-gelecek"
    CORS_ORIGINS="http://localhost:4000"
    NEXT_PUBLIC_ADMIN_API_BASE_URL="http://localhost:5003"
    NEXT_PUBLIC_INFLUENCER_API_BASE_URL="http://localhost:5003"
    ```

## 5. Veritabanını Hazırlayın

AfiLite, varsayılan olarak SQLite kullandığı için ek bir veritabanı sunucusu kurmanıza gerek yoktur. Sadece veritabanı şemasını oluşturmanız ve başlangıç verilerini yüklemeniz yeterlidir.

1.  **Veritabanı Şemasını Oluşturun (Migrations):**
    ```bash
    npm run db:migrate
    ```
    Bu komut, `src/db/migrations` klasöründeki tüm migration dosyalarını çalıştırarak veritabanı tablolarını oluşturacaktır.

2.  **Başlangıç Verilerini Yükleyin (Seeds):**
    ```bash
    npm run db:seed
    ```
    Bu komut, `src/db/seeds` klasöründeki seed dosyalarını çalıştırarak başlangıç admin kullanıcısı ve test influencer verilerini veritabanına ekleyecektir.

## 6. Uygulamayı Başlatın

Artık hem backend hem de frontend uygulamalarını başlatmaya hazırsınız.

1.  **Backend Sunucusunu Başlatın:**
    Proje kök dizininde olduğunuzdan emin olun ve aşağıdaki komutu çalıştırın:
    ```bash
    npm run dev
    ```
    Backend sunucusu `http://localhost:5003` adresinde çalışmaya başlayacaktır. Terminalde `[backend] Server is listening on http://localhost:5003` benzeri bir mesaj görmelisiniz.

2.  **Frontend Uygulamasını Başlatın:**
    Yeni bir terminal penceresi açın, `AfiLite/Ui` dizinine gidin ve aşağıdaki komutu çalıştırın:
    ```bash
    cd Ui
    npm run dev
    ```
    Frontend uygulaması `http://localhost:4000` adresinde çalışmaya başlayacaktır. Terminalde `ready - started server on 0.0.0.0:4000, url: http://localhost:4000` benzeri bir mesaj görmelisiniz.

## 7. İlk Çalıştırma ve Test

Her iki uygulama da başarıyla çalıştıktan sonra, tarayıcınızdan erişerek sistemi test edebilirsiniz:

1.  **Frontend Ana Sayfası:** Tarayıcınızda `http://localhost:4000` adresine gidin. Influencer başvuru formunu görmelisiniz.
2.  **Admin Paneli Girişi:** `http://localhost:4000/admin/login` adresine gidin.
    *   **Kullanıcı Adı:** `admin@afi.com`
    *   **Şifre:** `123456`
3.  **Influencer Paneli Girişi:** `http://localhost:4000/login` adresine gidin.
    *   **Kullanıcı Adı:** `inf1@test.com`
    *   **Şifre:** `123456`
    *   **Test Influencer Kodu:** `TESTQUFDLE`

Tebrikler! AfiLite sistemini başarıyla kurdunuz ve çalıştırdınız. Artık uygulamayı keşfetmeye başlayabilirsiniz.
