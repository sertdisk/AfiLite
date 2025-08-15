/*
 * Admin kullanıcısı oluşturma scripti
 * Bu script, sistemde admin kullanıcısı yoksa yeni bir admin kullanıcısı oluşturur.
 */

const knex = require('./src/db/sqlite');

async function createAdminUser() {
  try {
    // Admin kullanıcı zaten var mı?
    const existingAdmin = await knex('influencers')
      .where('role', 'admin')
      .first();
    
    if (existingAdmin) {
      console.log('Admin kullanıcı zaten mevcut:');
      console.log(`Email: ${existingAdmin.email}`);
      console.log('Şifreyi bilmiyorsanız, şifre sıfırlama özelliğini kullanabilirsiniz.');
      return;
    }
    
    // Yeni admin kullanıcısı oluştur
    const bcrypt = require('bcryptjs');
    const BCRYPT_SALT_ROUNDS = 11;
    
    const email = 'admin@afi.com';
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    
    const now = new Date();
    const adminData = {
      email,
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Admin User',
      tax_type: 'individual',
      phone: '0000000000',
      iban: 'TR000000000000000000000000',
      social_media: null,
      about: null,
      status: 'approved',
      followers: 0,
      created_at: now,
      updated_at: now
    };
    
    const [userId] = await knex('influencers').insert(adminData);
    
    console.log('Admin kullanıcı başarıyla oluşturuldu:');
    console.log(`Email: ${email}`);
    console.log(`Şifre: ${password}`);
    console.log(`User ID: ${userId}`);
    
  } catch (error) {
    console.error('Admin kullanıcı oluşturulurken hata oluştu:', error.message);
  } finally {
    await knex.destroy();
  }
}

// Script'i çalıştır
createAdminUser();