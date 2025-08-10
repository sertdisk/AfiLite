/*
  Hızlı seed scripti (şema uyumlu): influencer@test.com kullanıcısını oluşturur ve parolasını 'secret' olarak ayarlar.
  Aktif tablo şeması (20240802100000_init.js):
  - full_name, tax_type('individual'|'company'), phone, email, iban, social_media(TEXT JSON),
    about, message, status('pending'|'approved'|'rejected'), followers(INT),
    password_hash, role('admin'|'user'), created_at, updated_at
*/

// const knex = require('./sqlite'); // Bu satır gereksiz, knex parametresi seed fonksiyonu tarafından sağlanıyor
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  const influencers = [
    {
      email: 'influencer@test.com',
      password: 'secret',
      role: 'influencer',
      full_name: 'Ali Test',
      tax_type: 'individual',
      phone: '5550000000',
      iban: 'TR000000000000000000000000',
      social_media: JSON.stringify(['YouTube', 'Instagram']),
      about: 'Test influencer',
      message: null,
      status: 'approved',
      followers: 1000
    },
    {
      email: 'inf1@test.com',
      password: '123456',
      role: 'influencer',
      full_name: 'Inf1 Test',
      tax_type: 'individual',
      phone: '5551111111',
      iban: 'TR111111111111111111111111',
      social_media: JSON.stringify(['TikTok', 'Twitter']),
      about: 'Second test influencer',
      message: null,
      status: 'approved',
      followers: 2000,
      user_id: 2 // Add user_id to match token
    }
  ];

  const now = knex.fn.now();
  
  for (const influencer of influencers) {
    const { email, password, role, full_name, tax_type, phone, iban, social_media, about, message, status, followers } = influencer;
    
    // Parola hashle
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Mevcut kayıt var mı?
    const existing = await knex('influencers').where({ email }).first();

    if (existing) {
      await knex('influencers')
        .where({ id: existing.id })
        .update({
          full_name: existing.full_name || full_name,
          tax_type: existing.tax_type || tax_type,
          phone: existing.phone || phone,
          iban: existing.iban || iban,
          social_media: existing.social_media || social_media,
          about: existing.about || about,
          message: existing.message ?? message,
          status: existing.status || status,
          followers: existing.followers || followers,
          password_hash,
          role,
          updated_at: now
        });
      const updated = await knex('influencers').where({ id: existing.id }).first();
      console.log(`[seed:influencer] updated -> id=${updated.id}, email=${updated.email}, role=${updated.role}`);
    } else {
      // Yoksa yeni oluştur
      const [id] = await knex('influencers').insert({
        full_name,
        tax_type,
        phone,
        email,
        iban,
        social_media,
        about,
        message,
        status,
        followers,
        password_hash,
        role,
        created_at: now,
        updated_at: now
      });

      const created = await knex('influencers').where({ id }).first();
      console.log(`[seed:influencer] created -> id=${created.id}, email=${created.email}, role=${created.role}`);
    }
  }
};