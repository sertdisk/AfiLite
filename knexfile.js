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
  }
};