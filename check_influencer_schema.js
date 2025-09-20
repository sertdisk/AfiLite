const knex = require('./src/db/sqlite');

async function checkSchema() {
  try {
    // Get table info
    const tableInfo = await knex.raw("PRAGMA table_info('influencers')");
    console.log('Influencers table schema:');
    console.table(tableInfo);
    
    // Get indexes
    const indexes = await knex.raw("PRAGMA index_list('influencers')");
    console.log('\nInfluencers table indexes:');
    console.table(indexes);
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await knex.destroy();
  }
}

checkSchema();