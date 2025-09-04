exports.up = function(knex) {
  return knex.schema.createTable('alert_recipients', function(table) {
    table.increments('id').primary()
    table.integer('alert_id').unsigned().notNullable().references('id').inTable('system_alerts').onDelete('CASCADE')
    table.integer('influencer_id').unsigned().notNullable().references('id').inTable('influencers').onDelete('CASCADE')
    table.timestamp('created_at').defaultTo(knex.fn.now())

    table.unique(['alert_id', 'influencer_id'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('alert_recipients')
}
