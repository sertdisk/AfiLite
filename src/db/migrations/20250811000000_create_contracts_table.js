/**
 * Migration: contracts tablosu
 * Sözleşme versiyonlama sistemi için
 */
exports.up = async function(knex) {
  await knex.schema.createTable('contracts', (table) => {
    table.increments('id').primary();
    table.text('content').notNullable(); // Sözleşme içeriği
    table.integer('version').notNullable().unique(); // Sözleşme versiyonu (benzersiz)
    table.boolean('is_active').notNullable().defaultTo(false); // Aktif mi?
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['is_active'], 'idx_contracts_is_active');
    table.index(['version'], 'idx_contracts_version');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('contracts');
};