/**
 * Create payouts table
 */
exports.up = function(knex) {
  return knex.schema.createTable('payouts', function(table) {
    table.increments('id').primary();
    table.integer('influencer_id').unsigned().notNullable();
    table.decimal('amount', 10, 2).notNullable(); // Ödeme tutarı
    table.string('iban', 34).notNullable(); // IBAN numarası
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.text('note').nullable(); // Notlar
    table.timestamps(true, true);
    
    // Foreign key constraint
    table.foreign('influencer_id').references('id').inTable('influencers').onDelete('CASCADE');
    
    // Indexler
    table.index(['influencer_id', 'status']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payouts');
};