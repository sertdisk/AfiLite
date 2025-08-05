/*
  Hızlı seed scripti (şema uyumlu): influencer@test.com kullanıcısını oluşturur ve parolasını 'secret' olarak ayarlar.
  Aktif tablo şeması (20240802100000_init.js):
  - full_name, tax_type('individual'|'company'), phone, email, iban, social_media(TEXT JSON),
    about, message, status('pending'|'approved'|'rejected'), followers(INT),
    password_hash, role('admin'|'user'), created_at, updated_at
*/

const knex = require('./sqlite');
const bcrypt = require('bcryptjs');

async function upsertInfluencer() {
  const email = 'influencer@test.com';
  const password = 'secret'; // en az 6 karakter
  const role = 'user'; // şemaya göre 'user' influencer rolünü temsil ediyor
  const now = knex.fn.now();

  const full_name = 'Ali Test';
  const tax_type = 'individual';
  const phone = '5550000000';
  const iban = 'TR000000000000000000000000';
  const social_media = JSON.stringify(['YouTube', 'Instagram']);
  const about = 'Test influencer';
  const message = null;
  const status = 'approved';
  const followers = 1000;

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
    return { mode: 'updated', record: updated };
  }

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
  return { mode: 'created', record: created };
}

async function main() {
  try {
    const hasTable = await knex.schema.hasTable('influencers');
    if (!hasTable) {
      console.error('HATA: "influencers" tablosu bulunamadı. Önce migrasyonları çalıştırın.');
      process.exit(1);
    }

    const result = await upsertInfluencer();
    console.log(`[seed:influencer] ${result.mode} -> id=${result.record.id}, email=${result.record.email}, role=${result.record.role}`);
    process.exit(0);
  } catch (err) {
    console.error('[seed:influencer] Hata:', err?.message || err);
    process.exit(1);
  } finally {
    try { await knex.destroy(); } catch {}
  }
}

if (require.main === module) {
  main();
}

module.exports = { upsertInfluencer };