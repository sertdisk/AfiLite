exports.up = function(knex) {
  return knex.schema.table('influencers', function(table) {
    table.integer('user_id').unsigned().nullable().after('id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('influencers', function(table) {
    table.dropColumn('user_id');
  });
};