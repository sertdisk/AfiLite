exports.up = function(knex) {
  return knex.schema.createTable('influencer_social_accounts', function(table) {
    table.increments('id').primary();
    table.integer('influencer_id').unsigned().references('influencers.id').onDelete('CASCADE').notNullable();
    table.string('platform').notNullable(); // 'instagram', 'youtube', 'tiktok' vb.
    table.string('handle').notNullable(); // Kullanıcı adı veya ID
    table.string('url').nullable(); // Profil URL'si
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['influencer_id', 'platform', 'handle']); // Bir influencer'ın aynı platformda aynı handle'a sahip olmasını engelle
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('influencer_social_accounts');
};