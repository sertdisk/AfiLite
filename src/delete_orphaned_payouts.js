const knex = require('./db/sqlite');

async function deleteOrphanedPayouts() {
  try {
    // id'si 21 ve 42 olan influencer'lara ait ödeme kayıtlarını sil
    const deletedCount = await knex('payouts')
      .whereIn('influencer_id', [21, 42])
      .del();
    
    console.log(`Silinen ödeme kaydı sayısı: ${deletedCount}`);
  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await knex.destroy();
  }
}

// Betiği çalıştır
deleteOrphanedPayouts();