const knex = require('./db/sqlite');

async function checkInfluencerStatus() {
  try {
    // id'si 21 ve 42 olan influencer'ları veritabanından çek
    const influencerIds = [21, 42];
    const influencers = await knex('influencers')
      .whereIn('id', influencerIds)
      .select('id', 'full_name', 'email', 'status', 'created_at');

    console.log('Influencer Durumları:');
    console.log('====================');
    
    for (const influencer of influencers) {
      console.log(`ID: ${influencer.id}`);
      console.log(`Ad: ${influencer.full_name}`);
      console.log(`Email: ${influencer.email}`);
      console.log(`Durum: ${influencer.status}`);
      console.log(`Oluşturulma Tarihi: ${influencer.created_at}`);
      
      // Bu influencer'a ait ödeme kayıtlarını kontrol et
      const payouts = await knex('payouts')
        .where('influencer_id', influencer.id)
        .select('id', 'amount', 'status', 'iban', 'created_at', 'balance_before', 'balance_after', 'method', 'account', 'bank_name', 'account_holder_name');
      
      if (payouts.length > 0) {
        console.log('Ödeme Kayıtları:');
        payouts.forEach(payout => {
          console.log(`  Ödeme ID: ${payout.id}`);
          console.log(`  Tutar: ${payout.amount}`);
          console.log(`  Durum: ${payout.status}`);
          console.log(`  IBAN: ${payout.iban}`);
          console.log(`  Oluşturulma Tarihi: ${payout.created_at}`);
          console.log(`  Bakiye Önce: ${payout.balance_before}`);
          console.log(`  Bakiye Sonra: ${payout.balance_after}`);
          console.log(`  Yöntem: ${payout.method}`);
          console.log(`  Hesap: ${payout.account}`);
          console.log(`  Banka Adı: ${payout.bank_name}`);
          console.log(`  Hesap Sahibi: ${payout.account_holder_name}`);
          console.log('  ------------------------');
        });
      } else {
        console.log('Bu influencer için ödeme kaydı bulunamadı.');
      }
      
      console.log('====================');
    }
    
    // Eksik influencer'ları kontrol et
    const foundIds = influencers.map(i => i.id);
    const missingIds = influencerIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      console.log(`Aşağıdaki ID'lerde influencer bulunamadı: ${missingIds.join(', ')}`);
      console.log('====================');
    }
    
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await knex.destroy();
 }
}

// Betiği çalıştır
checkInfluencerStatus();