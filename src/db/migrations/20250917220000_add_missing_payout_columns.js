/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('payouts');
  if (hasTable) {
    await knex.schema.table('payouts', (table) => {
      table.string('method').nullable();
      table.string('account').nullable();
      table.string('bank_name').nullable();
      table.string('account_holder_name').nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('payouts');
  if (hasTable) {
    await knex.schema.table('payouts', (table) => {
      table.dropColumn('method');
      table.dropColumn('account');
      table.dropColumn('bank_name');
      table.dropColumn('account_holder_name');
    });
  }
};