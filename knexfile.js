module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename: './data/afilite.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  production: {
    client: 'sqlite3',
    connection: { filename: process.env.DB_PATH || './data/afilite.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  test: {
    client: 'sqlite3',
    connection: {
      // Kalıcı test veritabanı dosyası; CI için TEST_DB ile override edilebilir
      filename: process.env.TEST_DB || './data/test.sqlite'
    },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: {
      // In-memory paylaşımsız sorunlarını önlemek için tek bağlantı
      min: 1,
      max: 1,
      afterCreate: (conn, done) => {
        // Dosya tabanlı SQLite için güvenli PRAGMA'lar
        conn.run('PRAGMA journal_mode = WAL;');
        conn.run('PRAGMA busy_timeout = 5000;');
        conn.run('PRAGMA synchronous = NORMAL;', done);
      }
    }
  }
};