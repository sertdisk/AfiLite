// Kısa açıklama: Next.js yapılandırması — env değişkenleri process.env üzerinden okunur, ek özel ayar minimal tutulmuştur.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    ADMIN_API_BASE_URL: 'http://localhost:5003', // Backend portu 5003 olarak güncellendi
  },
};

module.exports = nextConfig;