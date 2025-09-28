# Mimari Yapı

AfiLite, esneklik ve ölçeklenebilirlik göz önünde bulundurularak tasarlanmış modüler bir mimariye sahiptir. Proje, hem bağımsız bir uygulama olarak çalışabilen başlı (headful) bir arayüze hem de mevcut sistemlere kolayca entegre edilebilen başsız (headless) bir API yapısına sahiptir.

## Genel Bakış

-   **Çift Modlu Yapı (Başlı ve Başsız):** AfiLite, farklı kullanım senaryolarına uyum sağlayacak şekilde tasarlanmıştır. İster hazır bir arayüzle hızlıca başlayın, ister kendi arayüzünüzü API üzerinden entegre edin.
-   **Katmanlı Mimari:** Uygulama, sorumlulukların net bir şekilde ayrıldığı katmanlı bir yapıya sahiptir: Sunum (Frontend), İş Mantığı (Backend API) ve Veri Erişim (Veritabanı).
-   **API Odaklı Geliştirme:** Tüm iş mantığı ve veri erişimi, RESTful API'lar aracılığıyla sunulur. Bu, frontend'in backend'den bağımsız olarak geliştirilmesine olanak tanır.

## Başlı (Headful) Çözüm

AfiLite, teknik bilgiye sahip olmayan kullanıcıların bile sistemi kolayca kurup yönetebilmesi için hazır bir kullanıcı arayüzü (UI) ile birlikte gelir. Bu arayüz, Next.js ve Tailwind CSS kullanılarak geliştirilmiştir ve aşağıdaki ana panelleri içerir:

-   **Admin Paneli:** Sistem yöneticilerinin influencer'ları, kodları, satışları, ödemeleri ve genel sistem ayarlarını yönettiği merkezi bir arayüzdür.
-   **Influencer Paneli:** Influencer'ların kendi kodlarını oluşturduğu, performanslarını takip ettiği, kazançlarını görüntülediği ve ödeme geçmişlerini incelediği kişisel bir alandır.

Bu başlı çözüm, hızlı başlangıç yapmak ve ek geliştirme maliyetlerinden kaçınmak isteyenler için idealdir.

## Başsız (Headless) Çözüm

AfiLite'ın kalbinde güçlü ve iyi belgelenmiş bir RESTful API bulunur. Bu API, geliştiricilere kendi özel arayüzlerini veya mevcut uygulamalarını AfiLite'ın backend'ine bağlama özgürlüğü sunar. Başsız mimarinin avantajları:

-   **Esneklik:** Kendi frontend teknolojinizi (React, Vue, Angular, mobil uygulamalar vb.) seçme özgürlüğü.
-   **Özelleştirilebilirlik:** Markanızın veya projenizin ihtiyaçlarına göre tamamen özelleştirilmiş kullanıcı deneyimleri oluşturma imkanı.
-   **Entegrasyon Kolaylığı:** Mevcut e-ticaret platformları, CRM sistemleri veya diğer iş uygulamalarıyla sorunsuz entegrasyon.

## Veritabanı Yapısı

AfiLite, veri depolama için SQLite kullanır. Veritabanı şeması, influencer'lar, indirim kodları, satışlar, ödemeler ve sistem ayarları gibi temel varlıkları içerir. Knex.js, veritabanı etkileşimlerini soyutlayarak güvenli ve kolay sorgu oluşturma imkanı sunar.

-   **Influencerlar:** Kullanıcı bilgileri, iletişim detayları, durum ve rol bilgileri.
-   **İndirim Kodları:** Influencer'lara özel oluşturulan kodlar, indirim ve komisyon oranları.
-   **Satışlar:** Kodlar aracılığıyla gerçekleşen satışların detayları, tutar ve komisyon bilgisi.
-   **Ödemeler:** Influencer'lara yapılan ödemelerin kayıtları.
-   **Sözleşmeler:** Influencer'lar ile yapılan sözleşmelerin versiyonları ve içerikleri.

## Güvenlik Katmanı

AfiLite, güvenlik en iyi uygulamalarını takip eder:

-   **JWT Kimlik Doğrulama:** API erişimi için JSON Web Token kullanılır.
-   **Rol Tabanlı Yetkilendirme:** Admin ve influencer rolleri için ayrıcalıklar tanımlanmıştır.
-   **Girdi Doğrulama:** Tüm API girişleri, potansiyel zafiyetlere karşı doğrulanır.
-   **Rate Limiting:** Sunucuyu aşırı yüklenmeye karşı korumak için API istek hızları sınırlandırılır.

Bu mimari, AfiLite'ı hem güçlü hem de yönetilebilir bir platform haline getirir.