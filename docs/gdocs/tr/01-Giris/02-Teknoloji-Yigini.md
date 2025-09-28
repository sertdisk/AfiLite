# Teknoloji Yığını

AfiLite, modern, hafif ve ölçeklenebilir teknolojiler kullanılarak geliştirilmiştir. Bu seçimler, projenin hem bakımını kolaylaştırmayı hem de geliştiricilere esnek bir çalışma ortamı sunmayı hedefler.

## Backend

- **Node.js:** Asenkron ve olay tabanlı yapısı sayesinde yüksek performanslı ve ölçeklenebilir bir sunucu ortamı sağlar.
- **Express.js:** Node.js için minimalist ve esnek bir web uygulama çatısıdır. API'larımızı hızlı ve verimli bir şekilde oluşturmamızı sağlar.
- **Knex.js:** SQL sorgu oluşturucu (Query Builder). Farklı veritabanlarıyla (SQLite, PostgreSQL, MySQL vb.) kolayca çalışmamızı sağlar ve SQL enjeksiyonu gibi zafiyetlere karşı güvenliği artırır.
- **SQLite:** Sunucusuz, yapılandırma gerektirmeyen, kendinden yeterli bir veritabanı motorudur. Geliştirme ortamı için idealdir ve küçük-orta ölçekli projelerde produksiyon için de kullanılabilir.
- **jsonwebtoken (JWT):** Kullanıcı oturumlarını yönetmek için güvenli ve standart bir yöntem sunar.
- **bcrypt.js:** Parolaları güvenli bir şekilde hash'lemek için kullanılır.

## Frontend

- **Next.js:** Sunucu tarafında render (SSR) ve statik site oluşturma (SSG) gibi modern React özelliklerini destekleyen, üretim ortamı için optimize edilmiş bir React çatısıdır.
- **React:** Kullanıcı arayüzleri oluşturmak için kullanılan popüler bir JavaScript kütüphanesidir.
- **Tailwind CSS:** Hızlı ve modern arayüzler oluşturmayı sağlayan, "utility-first" bir CSS çerçevesidir. `prose` eklentisi ile metin tabanlı içeriklerin (sözleşmeler gibi) stilini kolayca yönetir.

## Diğer Araçlar ve Kütüphaneler

- **Nodemon:** Geliştirme sırasında dosya değişikliklerini izleyerek sunucuyu otomatik olarak yeniden başlatır.
- **ESLint:** Kod kalitesini artırmak ve stil tutarlılığını sağlamak için kullanılan bir linter aracıdır.
- **Jest & Supertest:** Backend API'larının birim ve entegrasyon testleri için kullanılır.
- **Moment.js:** (Geçici olarak kullanıldı) Tarih ve zaman verilerini parse etmek, doğrulamak ve formatlamak için kullanılmıştır.
