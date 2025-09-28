# Kurulum Gereksinimleri

AfiLite'ı başarıyla kurmak ve çalıştırmak için sisteminizde belirli yazılımların yüklü olması gerekmektedir. Bu bölümde, kurulum öncesi hazırlık adımları ve gerekli tüm platformlar detaylı olarak açıklanmıştır.

## Genel Gereksinimler

Her kurulum senaryosu için aşağıdaki temel gereksinimler geçerlidir:

1.  **Node.js:** AfiLite'ın backend'i Node.js üzerinde çalışır. En az Node.js **v18.x** veya üzeri bir sürüm önerilir. Node.js kurulumu ile birlikte `npm` (Node Package Manager) da otomatik olarak yüklenecektir.
    *   **Kurulum Kontrolü:** Terminalinizde `node -v` ve `npm -v` komutlarını çalıştırarak yüklü sürümleri kontrol edebilirsiniz.
    *   **İndirme:** Eğer yüklü değilse, [Node.js resmi web sitesinden](https://nodejs.org/) işletim sisteminize uygun sürümü indirebilirsiniz.

2.  **Git:** Proje dosyalarını GitHub deposundan klonlamak için Git gereklidir.
    *   **Kurulum Kontrolü:** Terminalinizde `git --version` komutunu çalıştırarak yüklü sürümü kontrol edebilirsiniz.
    *   **İndirme:** Eğer yüklü değilse, [Git resmi web sitesinden](https://git-scm.com/downloads) işletim sisteminize uygun sürümü indirebilirsiniz.

3.  **Metin Düzenleyici / IDE:** Kodları görüntülemek, düzenlemek ve proje üzerinde çalışmak için bir metin düzenleyici veya Entegre Geliştirme Ortamı (IDE) önerilir. Popüler seçenekler:
    *   [Visual Studio Code](https://code.visualstudio.com/)
    *   [WebStorm](https://www.jetbrains.com/webstorm/)

## Veritabanı Gereksinimleri

AfiLite, varsayılan olarak **SQLite** veritabanını kullanır. SQLite, sunucusuz bir veritabanı olduğu için ek bir kurulum veya yapılandırma gerektirmez. Veritabanı dosyası proje dizini içinde otomatik olarak oluşturulur ve yönetilir.

*   **Ek Not:** Eğer farklı bir veritabanı (örneğin PostgreSQL, MySQL) kullanmak isterseniz, `knexfile.js` dosyasını ve ilgili bağımlılıkları (örneğin `pg` paketi) güncellemeniz gerekecektir. Ancak bu dokümantasyon varsayılan SQLite kurulumuna odaklanacaktır.

## Ortam Değişkenleri

AfiLite, hassas bilgileri ve yapılandırma ayarlarını yönetmek için ortam değişkenlerini kullanır. Projenin kök dizininde bir `.env` dosyası oluşturmanız ve aşağıdaki değişkenleri tanımlamanız gerekmektedir:

*   `.env` dosyasını oluşturmak için `example.env` dosyasını kopyalayabilirsiniz.

```dotenv
# Backend sunucusunun çalışacağı port
PORT=5003

# JWT (JSON Web Token) imzalamak için kullanılan gizli anahtar. Güçlü ve rastgele bir değer olmalıdır.
JWT_SECRET="cok-gizli-bir-anahtar-buraya-gelecek-ve-kimse-bilmeyecek"

# Frontend uygulamasının çalıştığı URL'ler. CORS için gereklidir.
# Birden fazla URL virgülle ayrılabilir. Örn: http://localhost:3000,http://localhost:4000
CORS_ORIGINS="http://localhost:4000"

# Frontend uygulamasının backend API'sine istek atarken kullanacağı base URL.
# Genellikle Next.js proxy'si kullanıldığı için boş bırakılabilir veya frontend'in kendi URL'si olabilir.
NEXT_PUBLIC_ADMIN_API_BASE_URL="http://localhost:5003"
NEXT_PUBLIC_INFLUENCER_API_BASE_URL="http://localhost:5003"

# Geliştirme ortamı için Redis bağlantı URL'si (isteğe bağlı, rate limiting için)
# REDIS_URL="redis://localhost:6379"

# Test ortamı için veritabanı yolu (isteğe bağlı)
# TEST_DB_PATH="./test.sqlite"

# Üretim ortamı için veritabanı yolu (isteğe bağlı)
# PRODUCTION_DB_PATH="./production.sqlite"
```

**Önemli Notlar:**

*   `JWT_SECRET` değeri kesinlikle gizli tutulmalı ve üretim ortamında güçlü, rastgele oluşturulmuş bir anahtar kullanılmalıdır.
*   `CORS_ORIGINS` değeri, frontend uygulamanızın çalıştığı URL'leri içermelidir. Güvenlik nedeniyle, sadece güvendiğiniz kaynaklara izin verin.

Bu gereksinimleri karşıladıktan sonra AfiLite kurulumuna geçmeye hazırsınız.
