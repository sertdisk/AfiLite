exports.up = function(knex) {
  return knex.schema.createTable('alert_reads', function(table) {
    table.increments('id').primary();
    table.integer('influencer_id').unsigned().notNullable().references('id').inTable('influencers');
    table.integer('alert_id').unsigned().notNullable().references('id').inTable('system_alerts');
    table.timestamp('read_at').defaultTo(knex.fn.now());
    table.unique(['influencer_id', 'alert_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('alert_reads');
};