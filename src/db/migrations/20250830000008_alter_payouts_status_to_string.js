/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('payouts', function(table) {
    table.string('status').defaultTo('completed').alter();
  })
  .then(() => {
    // Update existing rows to 'completed'
    return knex('payouts')
      .whereIn('status', ['pending', 'processing', 'failed'])
      .update({ status: 'completed' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('payouts', function(table) {
    // Revert to enum type and original default.
    // Note: This will only work if there are no 'completed' values that were not originally in the enum.
    // For a true rollback, you might need to handle data conversion or loss.
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending').alter();
  });
};

