// knex migration – creates 3 tables exactly matching ER diagram
exports.up = function (knex) {
  return knex.schema
    .createTable('influencers', (t) => {
      t.increments('id').primary();
      t.string('full_name').notNullable();
      t.enum('tax_type', ['individual', 'company']).notNullable();
      t.string('phone').notNullable();
      t.string('email').notNullable().unique();
      t.string('iban').notNullable();
      t.text('social_media'); // JSON string
      t.text('about');
      t.text('message');
      t.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      t.integer('followers').defaultTo(0);
      t.string('password_hash');
      t.enum('role', ['admin', 'user']).defaultTo('user');
      t.datetime('created_at').defaultTo(knex.fn.now());
      t.datetime('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('discount_codes', (t) => {
      t.increments('id').primary();
      t.integer('influencer_id').unsigned().references('influencers.id').onDelete('CASCADE');
      t.string('code').notNullable().unique();
      t.integer('discount_pct').checkBetween([1, 100]).notNullable();
      t.integer('commission_pct').checkBetween([1, 100]).notNullable();
      t.boolean('is_active').defaultTo(true);
      t.datetime('created_at').defaultTo(knex.fn.now());
    })
    .createTable('sales', (t) => {
      t.increments('id').primary();
      t.string('code').notNullable().references('discount_codes.code').onDelete('CASCADE');
      t.real('total_amount').notNullable();
      t.real('commission').notNullable();
      t.datetime('recorded_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('sales')
    .dropTableIfExists('discount_codes')
    .dropTableIfExists('influencers');
};