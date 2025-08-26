const request = require('supertest');
const createApp = require('../src/app');
let app;
const knex = require('../src/db/sqlite');

describe('AfiLite API Tests', () => {
  let adminToken;
  let influencerToken;
  let testInfluencerId;
  let testCodeId;

  beforeAll(async () => {
    app = createApp(); // Her test süiti için yeni bir uygulama örneği oluştur
    // Global setup migrasyonları çalıştırdı; yalnızca tablo temizliği yap
    await knex('sales').del();
    await knex('discount_codes').del();
    await knex('influencers').del();

    // Test admin kullanıcı oluştur (influencers tablosunda)
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    await knex('influencers').insert({
      full_name: 'Admin User',
      email: 'admin@test.com',
      phone: '+905551234567',
      iban: 'TR330006100519786457841326',
      tax_type: 'individual',
      status: 'approved',
      password_hash: passwordHash,
      role: 'admin'
    });

    // Admin token al
    const loginResponse = await request(app)
      .post('/api/v1/login')
      .send({
        email: 'admin@test.com',
        password: 'testpassword'
      });
    
    adminToken = loginResponse.body.token;
  });

  // Global teardown knex.destroy'ı yönetecek; suite içinde kapatma/rollback yok

  describe('Influencer Application Tests', () => {
    test('POST /api/v1/apply - Başarılı başvuru', async () => {
      const response = await request(app)
        .post('/api/v1/apply')
        .send({
          full_name: 'Test Influencer',
          email: 'influencer@test.com',
          phone: '+905551234567',
          social_media: ['instagram.com/test', 'tiktok.com/test'],
          followers: 5000,
          iban: 'TR11223344556677889900112233',
          tax_type: 'individual',
          about: 'Test influencer',
          message: 'Test message'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Başvurunuz başarıyla alındı');
      expect(response.body.influencer_id).toBeDefined();
      if (response.status === 201) { // Koruyucu assertion
        testInfluencerId = response.body.influencer_id;
      }
    });

    test('POST /api/v1/apply - Eksik alan hatası', async () => {
      const response = await request(app)
        .post('/api/v1/apply')
        .send({
          full_name: 'Test',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('GET /api/v1/apply - Tüm başvuruları listele', async () => {
      const response = await request(app)
        .get('/api/v1/apply')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.influencers).toBeDefined();
      expect(Array.isArray(response.body.influencers)).toBe(true);
    });

    test('PATCH /api/v1/apply/:id/status - Başvuru durumu güncelleme', async () => {
      const response = await request(app)
        .patch(`/api/v1/apply/${testInfluencerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Başvuru durumu güncellendi');
    });
  });

  describe('Discount Code Tests', () => {
    test('POST /api/v1/codes - Kod oluşturma', async () => {
      const response = await request(app)
        .post('/api/v1/codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST10',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('İndirim kodu oluşturuldu');
      expect(response.body.code_id).toBeDefined();
      if (response.status === 201) { // Koruyucu assertion
        testCodeId = response.body.code_id;
      }
    });

    test('GET /api/v1/codes - Tüm kodları listele', async () => {
      const response = await request(app)
        .get('/api/v1/codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.codes).toBeDefined();
      expect(Array.isArray(response.body.codes)).toBe(true);
    });

    test('GET /api/v1/codes/:id - Kod detayları', async () => {
      const response = await request(app)
        .get(`/api/v1/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.id).toBe(testCodeId);
    });
  });

  describe('Sale Tests', () => {
    test('POST /api/v1/sale - Satış kaydetme', async () => {
      const response = await request(app)
        .post('/api/v1/sale')
        .send({
          code: 'TEST10',
          total_amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Satış kaydedildi');
      expect(response.body.sale_id).toBeDefined();
    });

    test('GET /api/v1/sales - Satışları listele', async () => {
      const response = await request(app)
        .get('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sales).toBeDefined();
      expect(Array.isArray(response.body.sales)).toBe(true);
    });

    test('GET /api/v1/sales/stats - Satış istatistikleri', async () => {
      const response = await request(app)
        .get('/api/v1/sales/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total_sales).toBeDefined();
    });
  });

  describe('Balance Tests', () => {
    test('GET /api/v1/balance/:influencer_id - Bakiye kontrolü', async () => {
      const response = await request(app)
        .get(`/api/v1/balance/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.balance).toBeDefined();
      expect(response.body.balance.total_commission).toBeDefined();
    });

    test('GET /api/v1/balance/:influencer_id/history - Bakiye geçmişi', async () => {
      const response = await request(app)
        .get(`/api/v1/balance/${testInfluencerId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('Authentication Tests', () => {
    test('POST /api/v1/login - Admin login', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'admin@test.com',
          password: 'testpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('admin@test.com');
    });

    test('POST /api/v1/login - Geçersiz şifre', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz email veya şifre');
    });

    test('GET /api/v1/verify - Token doğrulama', async () => {
      const response = await request(app)
        .get('/api/v1/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('404 - Geçersiz endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/invalid-endpoint')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('401 - Token olmadan korumalı endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/codes');

      expect(response.status).toBe(401);
    });
  });
});