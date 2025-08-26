const knex = require('../src/db/sqlite');

async function checkSchema() {
  try {
    const columns = await knex('influencers').columnInfo();
    console.log('Influencers table columns:', Object.keys(columns));
  } catch (err) {
    console.error('Error querying schema:', err);
  } finally {
    knex.destroy();
  }
}

checkSchema();