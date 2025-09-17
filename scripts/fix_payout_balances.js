const knex = require('../src/db/sqlite');

async function fixPayouts() {
  try {
    const incorrectPayouts = await knex('payouts')
      .whereRaw('balance_after != balance_before - amount');

    if (incorrectPayouts.length === 0) {
      console.log('Herhangi bir hatalı ödeme kaydı bulunamadı.');
      return;
    }

    console.log(`${incorrectPayouts.length} adet hatalı ödeme kaydı bulundu. Düzeltiliyor...`);

    for (const payout of incorrectPayouts) {
      const correct_balance_after = payout.balance_before - payout.amount;
      await knex('payouts')
        .where('id', payout.id)
        .update({ balance_after: correct_balance_after });
      console.log(`ID ${payout.id} olan ödeme düzeltildi. Yeni bakiye: ${correct_balance_after}`);
    }

    console.log('Düzeltme işlemi tamamlandı.');
  } catch (error) {
    console.error('Düzeltme sırasında bir hata oluştu:', error);
  } finally {
    process.exit();
  }
}

fixPayouts();
