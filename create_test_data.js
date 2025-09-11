const knex = require('knex');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database connection - using the correct path
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'data', 'afilite.db')
  },
  useNullAsDefault: true
});

async function createTestData() {
  console.log('Test verisi oluşturuluyor...');
  
  try {
    // Tabloları temizle
    await db('sales').del();
    await db('discount_codes').del();
    await db('influencers').del();

    // Influencer oluşturma fonksiyonu
    async function createInfluencer(email, password, fullName, status = 'approved', withCode = false, codeApproved = false) {
      // Önce influencer'ı oluştur
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      
      const influencer = {
        full_name: fullName,
        email: email,
        phone: '+905551234567',
        tax_type: 'individual',
        iban: 'TR123456789012345678901234',
        social_media: JSON.stringify(['instagram', 'tiktok']),
        brand_name: `${fullName}'s Brand`,
        followers: Math.floor(Math.random() * 100000),
        status: status,
        password_hash: password_hash,
        role: 'influencer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const [influencerId] = await db('influencers').insert(influencer);
      console.log(`Influencer oluşturuldu: ${email}, ID: ${influencerId}`);
      
      // İndirim kodu isteniyorsa oluştur
      if (withCode) {
        const code = {
          code: `CODE${influencerId}${Math.floor(Math.random() * 1000)}`,
          influencer_id: influencerId,
          discount_pct: 15,
          commission_pct: 10,
          is_active: codeApproved,
          created_at: new Date().toISOString()
        };
        
        await db('discount_codes').insert(code);
        console.log(`İndirim kodu oluşturuldu: ${code.code} (onaylı: ${codeApproved})`);
      }
      
      return influencerId;
    }
    
    // 1. 5 influencer hesabı oluştur (indirim kodu yok)
    console.log('\n=== 1. Aşama: İndirim kodu olmayan 5 influencer ===');
    for (let i = 1; i <= 5; i++) {
      await createInfluencer(`1@inf${i}.com`, '123456', `Influencer ${i}`, 'approved', false);
    }
    
    // 2. 5 influencer hesabı oluştur (indirim kodu var, onaylanmamış)
    console.log('\n=== 2. Aşama: İndirim kodu olan ama onaylanmamış 5 influencer ===');
    for (let i = 1; i <= 5; i++) {
      await createInfluencer(`2@inf${i}.com`, '123456', `Influencer ${i + 5}`, 'approved', true, false);
    }
    
    // 3. 5 influencer hesabı oluştur (indirim kodu var, onaylanmış)
    console.log('\n=== 3. Aşama: İndirim kodu olan ve onaylanmış 5 influencer ===');
    for (let i = 1; i <= 5; i++) {
      await createInfluencer(`3@inf${i}.com`, '123456', `Influencer ${i + 10}`, 'approved', true, true);
    }
    
    // 4. 5 influencer hesabı oluştur (indirim kodu var, onaylanmış, 5'er satış yapılmış)
    console.log('\n=== 4. Aşama: İndirim kodu olan, onaylanmış ve 5\'er satış yapılmış 5 influencer ===');
    for (let i = 1; i <= 5; i++) {
      const influencerId = await createInfluencer(`4@inf${i}.com`, '123456', `Influencer ${i + 15}`, 'approved', true, true);
      
      // Bu influencer için 5 satış oluştur
      const codeRecord = await db('discount_codes').where('influencer_id', influencerId).first();
      if (codeRecord) {
        for (let j = 1; j <= 5; j++) {
          const sale = {
            code: codeRecord.code,
            total_amount: Math.floor(Math.random() * 1000) + 100, // 100-1100 arası rastgele tutar
            commission: 0, // İlk aşamada 0, sonra hesaplanacak
            recorded_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() // Rastgele tarih
          };
          
          // Komisyonu hesapla
          sale.commission = (sale.total_amount * codeRecord.commission_pct) / 100;
          
          await db('sales').insert(sale);
        }
        console.log(`5 satış oluşturuldu: ${codeRecord.code}`);
      }
    }
    
    console.log('\n=== Tüm test verileri oluşturuldu ===');
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

createTestData();