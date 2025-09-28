const knex = require('./db/sqlite');

async function checkPayoutsStatus() {
  try {
    // Tüm ödeme kayıtlarını veritabanından çek
    const allPayouts = await knex('payouts')
      .select('*');
    
    console.log('Tüm Ödeme Kayıtları:');
    console.log('====================');
    console.log(`Toplam ödeme kaydı: ${allPayouts.length}`);
    console.log('====================');
    
    // id'si 21 ve 42 olan influencer'lara ait ödeme kayıtlarını filtrele
    const influencerIds = [21, 42];
    const filteredPayouts = await knex('payouts')
      .whereIn('influencer_id', influencerIds)
      .select('*');
    
    console.log('ID\'si 21 ve 42 Olan Influencer\'lara Ait Ödeme Kayıtları:');
    console.log('=====================================================');
    
    for (const payout of filteredPayouts) {
      console.log(`Ödeme ID: ${payout.id}`);
      console.log(`Influencer ID: ${payout.influencer_id}`);
      console.log(`Tutar: ${payout.amount}`);
      console.log(`Durum: ${payout.status}`);
      console.log(`IBAN: ${payout.iban}`);
      console.log(`Oluşturulma Tarihi: ${payout.created_at}`);
      console.log(`Güncelleme Tarihi: ${payout.updated_at}`);
      
      // Ek alanlar varsa yazdır
      if (payout.balance_before !== undefined) {
        console.log(`Bakiye Önce: ${payout.balance_before}`);
      }
      if (payout.balance_after !== undefined) {
        console.log(`Bakiye Sonra: ${payout.balance_after}`);
      }
      if (payout.note !== undefined) {
        console.log(`Not: ${payout.note}`);
      }
      if (payout.method !== undefined) {
        console.log(`Yöntem: ${payout.method}`);
      }
      if (payout.account !== undefined) {
        console.log(`Hesap: ${payout.account}`);
      }
      if (payout.bank_name !== undefined) {
        console.log(`Banka Adı: ${payout.bank_name}`);
      }
      if (payout.account_holder_name !== undefined) {
        console.log(`Hesap Sahibi: ${payout.account_holder_name}`);
      }
      
      console.log('------------------------');
    }
    
    console.log(`Toplam filtrelenmiş ödeme kaydı: ${filteredPayouts.length}`);
    console.log('====================');
    
    // Eksik influencer'ları kontrol et
    const foundInfluencerIds = [...new Set(filteredPayouts.map(p => p.influencer_id))];
    const missingIds = influencerIds.filter(id => !foundInfluencerIds.includes(id));
    
    if (missingIds.length > 0) {
      console.log(`Aşağıdaki ID'lerde influencer için ödeme kaydı bulunamadı: ${missingIds.join(', ')}`);
      console.log('====================');
    }
    
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await knex.destroy();
  }
}

// Betiği çalıştır
checkPayoutsStatus();