const knex = require('./src/db/sqlite');

async function checkSchema() {
  try {
    const schema = await knex.raw("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'");
    console.log('Sales table schema:');
    console.log(schema[0].sql);
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await knex.destroy();
  }
}

checkSchema();