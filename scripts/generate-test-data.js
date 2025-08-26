#!/usr/bin/env node
/**
 * Test verisi oluşturma scripti
 * 
 * Bu script, influencer test verilerini oluşturmak için kullanılır.
 * 4 farklı senaryo için veri oluşturur:
 * 1. İndirim kodu olmayan influencerlar (5 adet)
 * 2. İndirim kodu var ama onaylanmamış influencerlar (5 adet)
 * 3. İndirim kodu var ve onaylanmış influencerlar (5 adet)
 * 4. İndirim kodu var, onaylanmış ve satışları olan influencerlar (5 adet, her biri için 5 satış)
 */

const knex = require('../src/db/sqlite');
const bcrypt = require('bcryptjs');

// Test verisi sabitleri
const PASSWORD = 'Test123456';
const DISCOUNT_PCT = 15;
const COMMISSION_PCT = 10;

// Helper fonksiyonlar
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function generateRandomCode(prefix = 'TEST') {
  return `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function generateRandomAmount(min = 50, max = 500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Influencer oluşturma fonksiyonu
async function createInfluencer(index, status = 'pending') {
  const hashedPassword = await hashPassword(PASSWORD);
  
  const influencer = {
    full_name: `Test Influencer ${index}`,
    tax_type: 'individual',
    phone: `555${String(index).padStart(7, '0')}`,
    email: `test${index}@example.com`,
    iban: `TR${String(index).padStart(24, '0')}`,
    social_media: JSON.stringify(['Instagram', 'YouTube', 'TikTok']),
    about: `Test influencer ${index} hakkında bilgi`,
    message: null,
    status: status,
    followers: Math.floor(Math.random() * 50000) + 1000,
    password_hash: hashedPassword,
    role: 'influencer',
    user_id: 1000 + index,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [id] = await knex('influencers').insert(influencer);
  return { id, ...influencer };
}

// Discount code oluşturma fonksiyonu
async function createDiscountCode(influencerId, isActive = true) {
  const code = generateRandomCode();
  
  const discountCode = {
    influencer_id: influencerId,
    code: code,
    discount_pct: DISCOUNT_PCT,
    commission_pct: COMMISSION_PCT,
    is_active: isActive,
    created_at: new Date()
  };

  const [id] = await knex('discount_codes').insert(discountCode);
  return { id, ...discountCode };
}

// Satış oluşturma fonksiyonu
async function createSales(code, count = 5) {
  const sales = [];
  
  for (let i = 0; i < count; i++) {
    const totalAmount = generateRandomAmount();
    const commission = (totalAmount * COMMISSION_PCT) / 100;
    
    sales.push({
      code: code,
      total_amount: totalAmount,
      commission: commission,
      recorded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Son 30 gün içinde
    });
  }

  await knex('sales').insert(sales);
  return sales;
}

// Temizlik fonksiyonu
async function cleanup() {
  console.log('Mevcut test verileri temizleniyor...');
  
  // Önce satışları sil
  await knex('sales').where('code', 'like', 'TEST%').del();
  
  // Sonra discount codes'u sil
  const testCodes = await knex('discount_codes')
    .where('code', 'like', 'TEST%')
    .select('id');
  
  if (testCodes.length > 0) {
    await knex('discount_codes').whereIn('id', testCodes.map(c => c.id)).del();
  }
  
  // Son olarak test influencerlarını sil
  await knex('influencers')
    .where('email', 'like', 'test%@example.com')
    .del();
    
  console.log('Temizlik tamamlandı.');
}

// Ana fonksiyon
async function generateTestData() {
  try {
    console.log('Test verisi oluşturma başlatılıyor...');
    
    // Temizlik yap
    await cleanup();
    
    let totalInfluencers = 0;
    let totalCodes = 0;
    let totalSales = 0;
    
    // 1. İndirim kodu olmayan influencerlar (5 adet)
    console.log('\n1. İndirim kodu olmayan influencerlar oluşturuluyor...');
    for (let i = 1; i <= 5; i++) {
      const influencer = await createInfluencer(i, 'approved');
      totalInfluencers++;
      console.log(`   - Influencer oluşturuldu: ${influencer.full_name} (${influencer.email})`);
    }
    
    // 2. İndirim kodu var ama onaylanmamış influencerlar (5 adet)
    console.log('\n2. İndirim kodu var ama onaylanmamış influencerlar oluşturuluyor...');
    for (let i = 6; i <= 10; i++) {
      const influencer = await createInfluencer(i, 'pending');
      const discountCode = await createDiscountCode(influencer.id, false);
      totalInfluencers++;
      totalCodes++;
      console.log(`   - Influencer oluşturuldu: ${influencer.full_name} (${influencer.email})`);
      console.log(`   - Discount code oluşturuldu: ${discountCode.code} (pasif)`);
    }
    
    // 3. İndirim kodu var ve onaylanmış influencerlar (5 adet)
    console.log('\n3. İndirim kodu var ve onaylanmış influencerlar oluşturuluyor...');
    for (let i = 11; i <= 15; i++) {
      const influencer = await createInfluencer(i, 'approved');
      const discountCode = await createDiscountCode(influencer.id, true);
      totalInfluencers++;
      totalCodes++;
      console.log(`   - Influencer oluşturuldu: ${influencer.full_name} (${influencer.email})`);
      console.log(`   - Discount code oluşturuldu: ${discountCode.code} (aktif)`);
    }
    
    // 4. İndirim kodu var, onaylanmış ve satışları olan influencerlar (5 adet, her biri için 5 satış)
    console.log('\n4. İndirim kodu var, onaylanmış ve satışları olan influencerlar oluşturuluyor...');
    for (let i = 16; i <= 20; i++) {
      const influencer = await createInfluencer(i, 'approved');
      const discountCode = await createDiscountCode(influencer.id, true);
      const sales = await createSales(discountCode.code, 5);
      totalInfluencers++;
      totalCodes++;
      totalSales += sales.length;
      
      console.log(`   - Influencer oluşturuldu: ${influencer.full_name} (${influencer.email})`);
      console.log(`   - Discount code oluşturuldu: ${discountCode.code} (aktif)`);
      console.log(`   - ${sales.length} satış oluşturuldu`);
    }
    
    console.log('\n=== Test Verisi Özeti ===');
    console.log(`Toplam Influencer: ${totalInfluencers}`);
    console.log(`Toplam Discount Code: ${totalCodes}`);
    console.log(`Toplam Satış: ${totalSales}`);
    console.log('Test verisi başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('Test verisi oluşturulurken hata:', error);
    throw error;
  } finally {
    await knex.destroy();
  }
}

// Script'i çalıştır
if (require.main === module) {
  generateTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { generateTestData };