const knex = require('../src/db/sqlite');

async function completePendingPayouts() {
  try {
    const pendingPayouts = await knex('payouts')
      .where('status', 'pending');

    if (pendingPayouts.length === 0) {
      console.log('Beklemede olan ödeme bulunamadı.');
      return;
    }

    console.log(`${pendingPayouts.length} adet beklemede olan ödeme bulundu. Durumları 'tamamlandı' olarak güncelleniyor...`);

    await knex('payouts')
      .where('status', 'pending')
      .update({ status: 'completed' });

    console.log('Güncelleme tamamlandı.');
  } catch (error) {
    console.error('Beklemedeki ödemeler güncellenirken hata oluştu:', error);
  } finally {
    if (knex) {
      knex.destroy();
    }
  }
}

completePendingPayouts();
