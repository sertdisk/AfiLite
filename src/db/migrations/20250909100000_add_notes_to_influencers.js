/**
 * Migration: influencers tablosuna notes alanı ekle
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers')
  if (hasTable) {
    const hasNotes = await knex.schema.hasColumn('influencers', 'notes')
    if (!hasNotes) {
      await knex.schema.table('influencers', (table) => {
        table.text('notes').nullable()
      })
    }
  }
}

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers')
  if (hasTable) {
    const hasNotes = await knex.schema.hasColumn('influencers', 'notes')
    if (hasNotes) {
      await knex.schema.table('influencers', (table) => {
        table.dropColumn('notes')
      })
    }
  }
}