/**
 * Migration: influencers tablosuna brand_name alanı ekle
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    const hasBrandName = await knex.schema.hasColumn('influencers', 'brand_name');
    if (!hasBrandName) {
      await knex.schema.table('influencers', (table) => {
        table.string('brand_name', 255).nullable();
      });
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    const hasBrandName = await knex.schema.hasColumn('influencers', 'brand_name');
    if (hasBrandName) {
      await knex.schema.table('influencers', (table) => {
        table.dropColumn('brand_name');
      });
    }
  }
};