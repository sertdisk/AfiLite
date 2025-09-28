# Geliştirme: Katkı Rehberi

AfiLite açık kaynaklı bir projedir ve topluluğun katkılarıyla daha da güçlenmeyi hedeflemektedir. Hata düzeltmeleri, yeni özellikler, dokümantasyon iyileştirmeleri veya performans optimizasyonları gibi her türlü katkı değerlidir. Bu rehber, projeye nasıl katkıda bulunabileceğinizi adım adım açıklamaktadır.

## 1. Katkıda Bulunmadan Önce

*   **Davranış Kuralları:** Lütfen projenin [Davranış Kuralları](CODE_OF_CONDUCT.md) belgesini okuyun ve katkılarınızda bu kurallara uyun.
*   **Mevcut Sorunları İnceleyin:** Katkıda bulunmak istediğiniz bir konu varsa, öncelikle [GitHub Issues](https://github.com/your-username/AfiLite/issues) bölümünü kontrol edin. Belki de üzerinde çalışmak istediğiniz konu zaten raporlanmış veya tartışılıyordur.
*   **Yeni Özellik Önerileri:** Yeni bir özellik eklemek istiyorsanız, öncelikle bir Issue açarak fikrinizi toplulukla paylaşın. Bu, gereksiz çalışmayı önler ve özelliğin proje hedefleriyle uyumlu olup olmadığını anlamamıza yardımcı olur.

## 2. Geliştirme Ortamını Kurma

Projeye katkıda bulunmak için geliştirme ortamınızı kurmanız gerekmektedir. Detaylı adımlar için [Adım Adım Kurulum](../02-Kurulum/03-Adim-Adim-Kurulum.md) rehberini takip edin.

## 3. Katkı Süreci

1.  **Depoyu Çatallayın (Fork):** AfiLite deposunu kendi GitHub hesabınıza çatallayın.
2.  **Depoyu Klonlayın:** Çatalladığınız depoyu yerel bilgisayarınıza klonlayın:
    ```bash
    git clone https://github.com/your-username/AfiLite.git
    cd AfiLite
    ```
3.  **Yeni Bir Dal (Branch) Oluşturun:** Yaptığınız her değişiklik için ana daldan (genellikle `main` veya `master`) yeni bir dal oluşturun. Dal adları, yaptığınız değişikliği yansıtmalıdır (örneğin, `feature/yeni-ozellik`, `bugfix/hata-adi`).
    ```bash
    git checkout -b feature/yeni-ozellik
    ```
4.  **Değişikliklerinizi Yapın:** Kodunuzu yazın, hataları düzeltin veya yeni özellikleri geliştirin.
5.  **Testleri Çalıştırın:** Değişikliklerinizin mevcut işlevselliği bozmadığından ve yeni eklediğiniz özelliklerin beklendiği gibi çalıştığından emin olmak için testleri çalıştırın.
    ```bash
    npm test
    ```
6.  **Kod Stilini Kontrol Edin:** Projenin kod stili kurallarına uymak için linter'ı çalıştırın ve varsa hataları düzeltin.
    ```bash
    npm run lint:fix
    ```
7.  **Değişikliklerinizi Kaydedin (Commit):** Yaptığınız değişiklikleri açıklayıcı bir mesajla kaydedin. Commit mesajlarınızın anlaşılır ve özlü olmasına özen gösterin.
    ```bash
    git commit -m "feat: Yeni özellik eklendi" # veya "fix: Hata düzeltildi"
    ```
8.  **Değişikliklerinizi Gönderin (Push):** Dalınızı kendi GitHub deponuza gönderin.
    ```bash
    git push origin feature/yeni-ozellik
    ```
9.  **Çekme İsteği (Pull Request) Oluşturun:** GitHub üzerinden AfiLite deposuna bir Çekme İsteği oluşturun. Çekme isteğinizde:
    *   Yaptığınız değişiklikleri açıkça açıklayın.
    *   Hangi sorunu çözdüğünü veya hangi özelliği eklediğini belirtin.
    *   Varsa ilgili Issue numaralarını referans gösterin.

## 4. Kod İncelemesi ve Birleştirme

Çekme isteğiniz oluşturulduktan sonra, proje yöneticileri veya diğer topluluk üyeleri tarafından incelenecektir. Geri bildirimlere açık olun ve istenen değişiklikleri yapmaya hazır olun. Kodunuz onaylandıktan sonra ana dala birleştirilecektir.

## 5. Teşekkürler!

Katkılarınız için şimdiden teşekkür ederiz! AfiLite'ı daha iyi bir platform haline getirmemize yardımcı olduğunuz için minnettarız.
