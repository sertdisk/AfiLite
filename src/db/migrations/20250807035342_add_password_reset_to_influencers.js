/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('influencers', function(table) {
    table.string('reset_token').nullable();
    table.datetime('reset_token_expires_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('influencers', function(table) {
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expires_at');
  });
};
