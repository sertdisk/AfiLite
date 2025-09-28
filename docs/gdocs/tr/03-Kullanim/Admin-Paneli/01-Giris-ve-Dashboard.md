# Admin Paneli: Giriş ve Dashboard

AfiLite Admin Paneli, tüm sistemi yönetmeniz ve denetlemeniz için merkezi bir arayüz sunar. Bu bölüm, admin paneline nasıl giriş yapacağınızı ve ana kontrol paneli (Dashboard) üzerinden hangi bilgilere erişebileceğinizi açıklar.

## 1. Admin Paneli Giriş

Admin paneline erişim, özel bir giriş sayfası üzerinden sağlanır ve yalnızca yetkili admin kullanıcıları için geçerlidir.

*   **Erişim:** Tarayıcınızda `http://localhost:4000/admin/login` adresine giderek admin giriş sayfasını görüntüleyebilirsiniz.

### Giriş Bilgileri

*   **E-posta:** Admin hesabınızın e-posta adresi.
*   **Şifre:** Admin hesabınızın şifresi.

Başarılı bir girişin ardından, doğrudan Admin Dashboard sayfasına yönlendirileceksiniz.

**Varsayılan Admin Bilgileri:**

*   **E-posta:** `admin@afi.com`
*   **Şifre:** `123456`

## 2. Admin Dashboard

Admin Dashboard, sistemin genel durumu hakkında hızlı bir bakış sunar. Burada, önemli metrikleri ve özet bilgileri tek bir ekranda görebilirsiniz.

### Genel Bakış Metrikleri

Dashboard'da aşağıdaki ana metrikler yer alır:

*   **Toplam Influencer Sayısı:** Sisteme kayıtlı toplam influencer sayısı.
*   **Aktif Influencer Sayısı:** Başvurusu onaylanmış ve aktif olan influencer sayısı.
*   **Bekleyen Influencer Başvuruları:** Onay bekleyen influencer başvurularının sayısı.
*   **Toplam İndirim Kodu Sayısı:** Sistemde oluşturulmuş toplam indirim kodu sayısı.
*   **Aktif İndirim Kodu Sayısı:** Şu anda aktif olan ve kullanılabilen indirim kodu sayısı.
*   **Toplam Satış Sayısı:** Tüm zamanlar boyunca gerçekleşen toplam satış adedi.
*   **Toplam Satış Tutarı:** Tüm satışlardan elde edilen toplam gelir.
*   **Toplam Ödenen Komisyon:** Influencer'lara bugüne kadar ödenen toplam komisyon miktarı.
*   **Toplam Ödenmemiş Komisyon:** Influencer'lara henüz ödenmemiş, kazanılmış komisyonların toplam miktarı.

### Son İşlemler ve Uyarılar

Dashboard, ayrıca sistemdeki son önemli olayları veya uyarıları da gösterebilir. Örneğin, yeni bir influencer başvurusu veya kritik bir sistem uyarısı gibi.

Admin Dashboard, sistemin sağlığını ve performansını anlık olarak takip etmeniz için güçlü bir araçtır. Daha detaylı yönetim işlemleri için sol menüdeki ilgili bölümleri kullanabilirsiniz.
