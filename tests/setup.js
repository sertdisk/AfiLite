process.env.NODE_ENV = 'test';
const knex = require('./../src/db/sqlite');

module.exports = async () => {
  // Test veritabanını migrate et
  await knex.migrate.latest();

  // Teşhisi doğrulamak için (geçici) tablo listesini logla
  try {
    const res = await knex.raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    // sqlite3 for Node: res has 'rows' in some drivers; use fallback
    const rows = res && (res.rows || res) || [];
    console.log('[TEST SETUP] Tables:', rows);
  } catch (e) {
    console.warn('[TEST SETUP] Table list failed:', e.message || e);
  }
};