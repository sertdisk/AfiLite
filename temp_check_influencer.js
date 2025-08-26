const knex = require('./src/db/sqlite'); // knex nesnesini alalım ki destroy edebilelim

async function runCheck() {
  try {
    const emailToTest = 'inf1@test.com';
    
    console.log(`[DEBUG] ${emailToTest} kullanıcısı aranıyor...`);
    const influencer = await knex('influencers').where({ email: emailToTest }).first();
    if (!influencer) {
      console.log(`[DEBUG] Influencer bulunamadı: ${emailToTest}`);
      return;
    }
    console.log(`[DEBUG] Influencer bulundu:`, influencer);
    
    console.log(`[DEBUG] ${influencer.id} ID'li influencer için kodlar aranıyor...`);
    const codes = await knex('discount_codes').where({ influencer_id: influencer.id });
    if (codes.length === 0) {
      console.log(`[DEBUG] ${influencer.id} ID'li influencer için kod bulunamadı.`);
    } else {
      console.log(`[DEBUG] ${influencer.id} ID'li influencer için kodlar bulundu:`, codes);
    }
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    // Bağlantı havuzunu kapatmak için knex bağlantısını yok et
    await knex.destroy();
    console.log('Knex bağlantısı kapatıldı.');
  }
}

runCheck();