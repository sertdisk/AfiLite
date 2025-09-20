/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    const hasTermsAccepted = await knex.schema.hasColumn('influencers', 'terms_accepted');
    if (!hasTermsAccepted) {
      await knex.schema.table('influencers', (table) => {
        table.boolean('terms_accepted').notNullable().defaultTo(false);
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    const hasTermsAccepted = await knex.schema.hasColumn('influencers', 'terms_accepted');
    if (hasTermsAccepted) {
      await knex.schema.table('influencers', (table) => {
        table.dropColumn('terms_accepted');
      });
    }
  }
};