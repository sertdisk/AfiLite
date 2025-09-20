const knex = require('./src/db/sqlite');

async function checkTestInfluencer() {
  try {
    // Get test influencer
    const influencer = await knex('influencers')
      .where('email', 'test1@example.com')
      .first();
    
    if (influencer) {
      console.log('Test Influencer 1:');
      console.log('- ID:', influencer.id);
      console.log('- Full Name:', influencer.full_name);
      console.log('- Email:', influencer.email);
      console.log('- Brand Name:', influencer.brand_name);
      console.log('- Phone:', influencer.phone);
      console.log('- Country Code:', influencer.country_code);
      console.log('- Is WhatsApp Active:', influencer.is_whatsapp_active);
      console.log('- Alternative Phone:', influencer.alternative_phone);
      console.log('- Bio:', influencer.bio);
      console.log('- About:', influencer.about);
      console.log('- Platform Message:', influencer.platform_message);
      console.log('- Business Type:', influencer.business_type);
      console.log('- Commercial Title:', influencer.commercial_title);
      console.log('- Tax Office:', influencer.tax_office);
      console.log('- Tax Number:', influencer.tax_number);
      console.log('- Business Address:', influencer.business_address);
      console.log('- General Message:', influencer.general_message);
      console.log('- Terms Accepted:', influencer.terms_accepted);
      
      // Get social accounts
      const socialAccounts = await knex('influencer_social_accounts')
        .where('influencer_id', influencer.id);
      
      console.log('\nSocial Accounts:');
      socialAccounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.platform}: ${account.username}`);
        console.log(`     - Address: ${account.address}`);
        console.log(`     - Niche: ${account.niche}`);
        console.log(`     - Role: ${account.role}`);
        console.log(`     - Followers: ${account.followers}`);
        console.log(`     - Avg Views: ${account.avgViews}`);
      });
      
      // Get payment account
      const paymentAccount = await knex('influencer_payment_accounts')
        .where('influencer_id', influencer.id)
        .first();
      
      if (paymentAccount) {
        console.log('\nPayment Account:');
        console.log('- Bank Name:', paymentAccount.bank_name);
        console.log('- Account Holder:', paymentAccount.account_holder_name);
        console.log('- IBAN:', paymentAccount.iban);
      }
    } else {
      console.log('Test influencer not found');
    }
  } catch (error) {
    console.error('Error checking test influencer:', error);
  } finally {
    await knex.destroy();
  }
}

checkTestInfluencer();