exports.up = function(knex) {
  return knex.schema.table('sales', function(table) {
    table.text('note');
  });
};

exports.down = function(knex) {
  return knex.schema.table('sales', function(table) {
    table.dropColumn('note');
  });
};