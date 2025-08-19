// Kısa açıklama: Next.js yapılandırması — env değişkenleri process.env üzerinden okunur, ek özel ayar minimal tutulmuştur.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    ADMIN_API_BASE_URL: 'http://localhost:5003', // Backend portu 5003 olarak güncellendi
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/:path*`,
      },
      {
        source: '/api/sales/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/sales/:path*`,
      },
      {
        source: '/api/payouts/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/payouts/:path*`,
      },
      {
        source: '/api/influencers/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/influencers/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/auth/:path*`,
      },
      {
        source: '/api/campaigns/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/campaigns/:path*`,
      },
      {
        source: '/api/commissions/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/commissions/:path*`,
      },
      {
        source: '/api/contracts/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/contracts/:path*`,
      },
      {
        source: '/api/messages/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/messages/:path*`,
      },
      {
        source: '/api/alerts/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/alerts/:path*`,
      },
      {
        source: '/api/apply/:path*',
        destination: `${nextConfig.env.ADMIN_API_BASE_URL}/api/v1/apply/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;