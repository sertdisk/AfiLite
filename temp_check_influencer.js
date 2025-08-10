const { checkInfluencer } = require('./src/db/sqlite');
const knex = require('./src/db/sqlite'); // knex nesnesini de alalım ki destroy edebilelim

async function runCheck() {
  try {
    // Test için bir influencer ekle
    const emailToTest = 'inf1@test.com';
    const bcrypt = require('bcrypt'); // bcrypt'i dahil et
    const password = '123456'; // Kullanıcının istediği parola
    const passwordHash = await bcrypt.hash(password, 10); // Parolayı hashle
    const now = knex.fn.now();

    // Mevcutsa sil, sonra ekle
    await knex('influencers').where({ email: emailToTest }).del();
    console.log(`[DEBUG] Mevcut influencer ${emailToTest} silindi (varsa).`);

    await knex('influencers').insert({
      full_name: 'Test Influencer 1',
      email: emailToTest,
      phone: '+905551112233',
      iban: 'TR11223344556677889900112233',
      tax_type: 'individual',
      social_media: JSON.stringify(['instagram.com/inf1']),
      about: 'Test influencer for checkInfluencer function.',
      status: 'approved',
      followers: 5000,
      password_hash: passwordHash,
      role: 'user',
      created_at: now,
      updated_at: now,
    });
    console.log(`[DEBUG] Influencer ${emailToTest} eklendi.`);

    console.log('Influencer kontrolü başlatılıyor...');
    const influencer = await checkInfluencer(emailToTest);
    if (influencer) {
      console.log('Influencer Detayları:', influencer);
    } else {
      console.log('Influencer Detayları: Bulunamadı');
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