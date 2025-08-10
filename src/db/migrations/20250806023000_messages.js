/**
 * Migration: messages tablosu ve indeksler
 * Admin ve influencer kullanıcıları 'influencers' tablosunda role alanıyla temsil edilir.
 * from_user_id/to_user_id alanları influencers.id'ye referans verir.
 * read_at null ise mesaj okunmamıştır.
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('messages');
  if (!hasTable) {
    await knex.schema.createTable('messages', (t) => {
      t.increments('id').primary();
      t
        .enu('from_role', ['admin', 'influencer'], { useNative: false, enumName: 'message_from_role' })
        .notNullable();
      t
        .enu('to_role', ['admin', 'influencer'], { useNative: false, enumName: 'message_to_role' })
        .notNullable();

      // Kullanıcı referansları (influencers.id)
      t.integer('from_user_id').unsigned().notNullable().references('influencers.id').onDelete('CASCADE');
      t.integer('to_user_id').unsigned().notNullable().references('influencers.id').onDelete('CASCADE');

      // İçerik
      t.text('body').notNullable();

      // Okunma ve zaman damgaları
      t.timestamp('read_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    // Performans indeksleri
    await knex.schema.alterTable('messages', (t) => {
      t.index(['to_user_id', 'to_role', 'read_at'], 'idx_messages_to_unread');
      t.index(['from_user_id', 'from_role', 'created_at'], 'idx_messages_from_created');
      t.index(['created_at'], 'idx_messages_created_at');
    });
  }
};

exports.down = async function(knex) {
  // İndeksler tablo ile birlikte düşer; güvenli sıralı silme
  await knex.schema.dropTableIfExists('messages');
};