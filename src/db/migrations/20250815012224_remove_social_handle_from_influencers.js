/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers')
  if (hasTable) {
    const hasSocialHandle = await knex.schema.hasColumn('influencers', 'social_handle')
    if (hasSocialHandle) {
      await knex.schema.table('influencers', (table) => {
        table.dropColumn('social_handle')
      })
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers')
  if (hasTable) {
    const hasSocialHandle = await knex.schema.hasColumn('influencers', 'social_handle')
    if (!hasSocialHandle) {
      await knex.schema.table('influencers', (table) => {
        table.string('social_handle', 255).nullable() // Varsayılan olarak nullable ekliyoruz
      })
    }
  }
}
