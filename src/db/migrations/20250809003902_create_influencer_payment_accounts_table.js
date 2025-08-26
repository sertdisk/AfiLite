exports.up = function(knex) {
  return knex.schema.createTable('influencer_payment_accounts', function(table) {
    table.increments('id').primary();
    table.integer('influencer_id').unsigned().references('influencers.id').onDelete('CASCADE').notNullable();
    table.string('bank_name').notNullable();
    table.string('account_holder_name').notNullable();
    table.string('iban').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true); // Yeni eklendiğinde eski pasif olsun
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['influencer_id', 'iban']); // Bir influencer'ın aynı IBAN'a sahip olmasını engelle
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('influencer_payment_accounts');
};