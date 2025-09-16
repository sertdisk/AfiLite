/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // SQLite does not support multiple alter table statements in one transaction well,
  // and renaming columns is tricky. The safest way is to recreate the table.

  // 1. Create a temporary table with the new schema
  await knex.schema.createTable('influencer_social_accounts_temp', (table) => {
    table.increments('id').primary();
    table.integer('influencer_id').notNullable().references('id').inTable('influencers').onDelete('CASCADE');
    table.string('platform').notNullable();
    table.string('username').notNullable(); // Renamed from handle
    table.string('address').nullable(); // Renamed from url
    table.string('niche').nullable(); // Added
    table.string('role').nullable(); // Added
    table.integer('followers').defaultTo(0); // Added
    table.integer('avgViews').defaultTo(0); // Added
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Copy data from the old table to the temp table, mapping columns explicitly
  const accounts = await knex('influencer_social_accounts').select(
      'id', 
      'influencer_id', 
      'platform', 
      'handle', 
      'url', 
      'is_active', 
      'created_at', 
      'updated_at'
    );
    
  if (accounts.length > 0) {
    const mappedAccounts = accounts.map(acc => ({
      id: acc.id,
      influencer_id: acc.influencer_id,
      platform: acc.platform,
      username: acc.handle, // map handle to username
      address: acc.url, // map url to address
      is_active: acc.is_active,
      created_at: acc.created_at,
      updated_at: acc.updated_at,
      // New fields (niche, role, followers, avgViews) will get default values
    }));
    await knex('influencer_social_accounts_temp').insert(mappedAccounts);
  }

  // 3. Drop the old table
  await knex.schema.dropTable('influencer_social_accounts');

  // 4. Rename the temp table to the original table name
  await knex.schema.renameTable('influencer_social_accounts_temp', 'influencer_social_accounts');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Reverting this is complex, a simple drop and recreate is shown for simplicity
  await knex.schema.dropTableIfExists('influencer_social_accounts');
  await knex.schema.createTable('influencer_social_accounts', (table) => {
      table.increments('id').primary();
      table.integer('influencer_id').notNullable().references('id').inTable('influencers').onDelete('CASCADE');
      table.string('platform').notNullable();
      table.string('handle').notNullable();
      table.string('url').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
};