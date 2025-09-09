module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('oracledb', 'pg-query-stream', 'knex');
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:5003/api/admin/:path*'
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:5003/api/:path*'
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:5003/auth/:path*'
      }
    ]
  }
};