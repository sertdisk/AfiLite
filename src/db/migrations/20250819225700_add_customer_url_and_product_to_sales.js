// knex migration – adds customer_url and product columns to sales table
exports.up = function(knex) {
  return knex.schema.table('sales', (t) => {
    t.string('customer_url')
    t.string('product')
  })
}

exports.down = function(knex) {
  return knex.schema.table('sales', (t) => {
    t.dropColumn('customer_url')
    t.dropColumn('product')
  })
}