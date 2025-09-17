const knex = require('./src/db/sqlite');

async function checkData() {
  try {
    const payouts = await knex('payouts').where({ influencer_id: 82 });
    console.log('Payouts for influencer_id 82:', payouts);
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await knex.destroy();
  }
}

checkData();