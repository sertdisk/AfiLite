const knex = require('./src/db/sqlite');

async function checkSchema() {
  try {
    // Get table info
    const tableInfo = await knex.raw("PRAGMA table_info('payouts')");
    console.log('Payouts table schema:');
    console.table(tableInfo);
    
    // Get indexes
    const indexes = await knex.raw("PRAGMA index_list('payouts')");
    console.log('\nPayouts table indexes:');
    console.table(indexes);
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await knex.destroy();
  }
}

checkSchema();