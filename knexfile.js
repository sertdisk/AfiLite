module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename: './data/afilite.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn, done) => {
        conn.run('PRAGMA busy_timeout = 7500;', done);
      }
    }
  },
  production: {
    client: 'sqlite3',
    connection: { filename: process.env.DB_PATH || '/home/berennas/Belgeler/apps/AfiLite/data/afilite.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: {
      min: 1,
      max: 10, // Üretim ortamında daha fazla bağlantı
      afterCreate: (conn, done) => {
        conn.run('PRAGMA journal_mode = WAL;');
        conn.run('PRAGMA wal_autocheckpoint = 1000;');
        conn.run('PRAGMA busy_timeout = 10000;');
        conn.run('PRAGMA synchronous = NORMAL;');
        conn.run('PRAGMA temp_store = MEMORY;');
        conn.run('PRAGMA mmap_size = 268435456;', done);
      }
    }
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: process.env.TEST_DB || './data/test.sqlite'
    },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn, done) => {
        conn.run('PRAGMA journal_mode = WAL;');
        conn.run('PRAGMA wal_autocheckpoint = 1000;'); // Eklendi
        conn.run('PRAGMA busy_timeout = 10000;'); // Güncellendi
        conn.run('PRAGMA synchronous = NORMAL;');
        conn.run('PRAGMA temp_store = MEMORY;'); // Eklendi
        conn.run('PRAGMA mmap_size = 268435456;', done); // Eklendi ve done callback'i
      }
    }
  }
};