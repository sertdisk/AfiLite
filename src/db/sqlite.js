const knexLib = require('knex');
const knexfile = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

const knex = knexLib(config);

// SQLite için yazma yoğun senaryolarda kararlılığı artıran PRAGMA ayarları
(async () => {
  try {
    // client adı sqlite ya da sqlite3 içeriyorsa uygula
    const clientName = (config && config.client) ? String(config.client).toLowerCase() : '';
    if (clientName.includes('sqlite')) {
      // WAL modu: eşzamanlı okuma/yazma kararlılığı
      await knex.raw('PRAGMA journal_mode = WAL;');
      // WAL checkpoint aralığı (varsayılan 1000)
      await knex.raw('PRAGMA wal_autocheckpoint = 1000;');
      // Yoğun write contention için bekleme süresi
      await knex.raw('PRAGMA busy_timeout = 10000;');
      // Senkronizasyon seviyesi (NORMAL genelde iyi dengedir)
      await knex.raw('PRAGMA synchronous = NORMAL;');
      // Geçici tablolar için bellek kullanımı
      await knex.raw('PRAGMA temp_store = MEMORY;');
      // Bellek eşlemeli I/O boyutu (256MB)
      try {
        await knex.raw('PRAGMA mmap_size = 268435456;');
      } catch (e) {
        console.warn('SQLite mmap_size not supported:', e.message);
      }
    }
  } catch (e) {
    // Bazı ortamlarda PRAGMA desteklenmeyebilir; uyarı verip devam et
    console.warn('SQLite PRAGMA initialization warning:', e && e.message ? e.message : e);
  }
})();

module.exports = knex;