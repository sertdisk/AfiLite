/**
 * Migration: influencers tablosu
 * Notlar:
 * - channels alanı JSON string (TEXT) olarak saklanır (SQLite uyumu).
 * - email için UNIQUE index.
 * - status + created_at ikincil index.
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (!hasTable) {
    await knex.schema.createTable('influencers', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().index(); // Uygulama kullanıcısına referans (users tablosu dışı)
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('social_handle', 255).notNullable();
      table.string('niche', 255).notNullable();
      table.text('channels').notNullable(); // JSON metin
      table.string('country', 100).notNullable();
      table.boolean('terms_accepted').notNullable().defaultTo(false);
      table.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
      table.text('bio').nullable();
      table.string('website', 512).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      // İndeksler
      table.index(['status', 'created_at'], 'idx_influencers_status_created_at');
    });
  } else {
    // tablo varsa eksik indexleri güvence altına al
    const hasStatusCreatedIdx = await knex.schema.hasColumn('influencers', 'status');
    if (hasStatusCreatedIdx) {
      try {
        await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_influencers_status_created_at ON influencers (status, created_at)');
      } catch (e) {
        // SQLite bazı sürümlerde IF NOT EXISTS desteklemeyebilir, hata güvenli biçimde yoksay
      }
    }
    try {
      await knex.schema.raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_influencers_email_unique ON influencers (email)');
    } catch (e) {
      // tablo oluşturulurken unique vardı; yoksa oluşturulmaya çalışılır
    }
  }
};

exports.down = async function(knex) {
  // Basit geri alma: tabloyu sil
  await knex.schema.dropTableIfExists('influencers');
};