const knex = require('../src/db/sqlite');

async function checkInfluencers() {
  try {
    const influencers = await knex('influencers').select('id', 'email', 'user_id');
    console.log('Influencers:', influencers);
  } catch (err) {
    console.error('Error querying influencers:', err);
  } finally {
    knex.destroy();
  }
}

checkInfluencers();