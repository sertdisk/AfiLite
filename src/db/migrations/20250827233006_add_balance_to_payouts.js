exports.up = function(knex) {
  return knex.schema.table('payouts', function(table) {
    table.decimal('balance_before', 10, 2).nullable()
    table.decimal('balance_after', 10, 2).nullable()
  })
}

exports.down = function(knex) {
  return knex.schema.table('payouts', function(table) {
    table.dropColumn('balance_before')
    table.dropColumn('balance_after')
  })
}