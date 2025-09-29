const request = require('supertest');
const createApp = require('../src/app');
const knex = require('../src/db/sqlite');

let app;
let adminToken;
let influencerToken;
let testInfluencerId;
let testCodeId;
let testSaleId;

describe('End-to-End Influencer Flow Tests', () => {
  beforeAll(async () => {
    app = createApp();
    await knex.migrate.latest();
    await knex.seed.run(); // Seed verileri yükle
    
    // Admin kullanıcısı oluştur ve token al
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
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

    const loginResponse = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Complete Influencer Registration and Management Flow', () => {
    test('Complete influencer registration flow', async () => {
      // 1. Influencer başvurusu yap
      const applyResponse = await request(app)
        .post('/api/apply')
        .send({
          full_name: 'E2E Test Influencer',
          email: 'e2e@test.com',
          phone: '+905551234567',
          iban: 'TR32001000999999',
          tax_type: 'individual',
          about: 'Test influencer for E2E testing',
          message: 'E2E test message'
        });

      expect(applyResponse.status).toBe(201);
      expect(applyResponse.body.message).toContain('Başvurunuz');
      testInfluencerId = applyResponse.body.influencer_id;

      // 2. Admin onayı ile influencer durumunu onayla
      const approveResponse = await request(app)
        .patch(`/api/apply/${testInfluencerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.message).toBe('Başvuru durumu güncellendi');

      // 3. Influencer olarak giriş yap
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'e2e@test.com',
          password: 'password123' // Varsayılan şifre
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      influencerToken = loginResponse.body.token;

      // 4. Profil bilgilerini kontrol et
      const profileResponse = await request(app)
        .get('/api/influencers/profile')
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.influencer.email).toBe('e2e@test.com');
      expect(profileResponse.body.influencer.status).toBe('approved');
    });

    test('Complete discount code and sales flow', async () => {
      // 1. Influencer indirim kodu oluştur
      const codeResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'E2ETEST20',
          discount_percentage: 20,
          influencer_id: testInfluencerId
        });

      expect(codeResponse.status).toBe(201);
      expect(codeResponse.body.message).toBe('İndirim kodu oluşturuldu');
      testCodeId = codeResponse.body.code_id;

      // 2. Satış yap
      const saleResponse = await request(app)
        .post('/api/sale')
        .send({
          code: 'E2ETEST20',
          total_amount: 150
        });

      expect(saleResponse.status).toBe(201);
      expect(saleResponse.body.message).toBe('Satış kaydedildi');
      testSaleId = saleResponse.body.sale_id;

      // 3. Influencer bakiyesini kontrol et
      const balanceResponse = await request(app)
        .get(`/api/balance/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.balance).toBeDefined();
      expect(balanceResponse.body.balance.total_commission).toBeGreaterThan(0);

      // 4. Satış geçmişi kontrolü
      const salesHistoryResponse = await request(app)
        .get(`/api/balance/${testInfluencerId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(salesHistoryResponse.status).toBe(200);
      expect(Array.isArray(salesHistoryResponse.body.history)).toBe(true);
      expect(salesHistoryResponse.body.history.length).toBeGreaterThan(0);
    });

    test('Influencer dashboard and reporting flow', async () => {
      // 1. Influencer dashboard verilerini al
      const dashboardResponse = await request(app)
        .get('/api/influencer/dashboard')
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.summary).toBeDefined();
      expect(dashboardResponse.body.recent_sales).toBeDefined();
      expect(dashboardResponse.body.commission_stats).toBeDefined();

      // 2. Influencer performans verilerini al
      const performanceResponse = await request(app)
        .get('/api/influencer/performance')
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.body.performance).toBeDefined();
      expect(performanceResponse.body.metrics).toBeDefined();

      // 3. Satış istatistikleri
      const statsResponse = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ influencer_id: testInfluencerId });

      expect(statsResponse.status).toBe(20);
      expect(statsResponse.body.stats).toBeDefined();
      expect(statsResponse.body.stats.total_sales).toBeGreaterThan(0);
      expect(statsResponse.body.stats.commission_amount).toBeGreaterThan(0);
    });
 });

  describe('Admin Management Flow', () => {
    test('Admin influencer and sales management flow', async () => {
      // 1. Admin olarak tüm influencer'ları listele
      const influencersResponse = await request(app)
        .get('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(influencersResponse.status).toBe(200);
      expect(Array.isArray(influencersResponse.body.influencers)).toBe(true);
      expect(influencersResponse.body.influencers.length).toBeGreaterThan(0);

      // 2. Admin olarak tüm satışları listele
      const salesResponse = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(salesResponse.status).toBe(200);
      expect(Array.isArray(salesResponse.body.sales)).toBe(true);
      expect(salesResponse.body.sales.length).toBeGreaterThan(0);

      // 3. Admin olarak tüm kodları listele
      const codesResponse = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(codesResponse.status).toBe(200);
      expect(Array.isArray(codesResponse.body.codes)).toBe(true);
      expect(codesResponse.body.codes.length).toBeGreaterThan(0);

      // 4. Admin olarak komisyon oranlarını yönet
      const commissionResponse = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(commissionResponse.status).toBe(200);
      expect(commissionResponse.body.commission_rates).toBeDefined();
    });

    test('Admin payout management flow', async () => {
      // 1. Ödeme talebi oluştur
      const payoutResponse = await request(app)
        .post('/api/payouts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          influencer_id: testInfluencerId,
          amount: 50,
          status: 'pending'
        });

      expect(payoutResponse.status).toBe(201);
      expect(payoutResponse.body.message).toBe('Ödeme talebi oluşturuldu');
      const payoutId = payoutResponse.body.payout_id;

      // 2. Ödeme taleplerini listele
      const payoutsResponse = await request(app)
        .get('/api/payouts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(payoutsResponse.status).toBe(200);
      expect(Array.isArray(payoutsResponse.body.payouts)).toBe(true);
      expect(payoutsResponse.body.payouts.length).toBeGreaterThan(0);

      // 3. Belirli bir ödeme talebini kontrol et
      const singlePayoutResponse = await request(app)
        .get(`/api/payouts/${payoutId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(singlePayoutResponse.status).toBe(20);
      expect(singlePayoutResponse.body.payout.id).toBe(payoutId);
    });
  });

  describe('Complete Business Flow Validation', () => {
    test('Validate complete business logic flow', async () => {
      // 1. Yeni bir influencer başvurusu
      const newApplyResponse = await request(app)
        .post('/api/apply')
        .send({
          full_name: 'Business Flow Test',
          email: 'business@test.com',
          phone: '+905551234568',
          iban: 'TR320010009999998',
          tax_type: 'company',
          about: 'Business flow test',
          message: 'Business flow test message'
        });

      expect(newApplyResponse.status).toBe(201);
      const newInfluencerId = newApplyResponse.body.influencer_id;

      // 2. Admin onayı
      const approveResponse = await request(app)
        .patch(`/api/apply/${newInfluencerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(approveResponse.status).toBe(200);

      // 3. Influencer giriş yap
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'business@test.com',
          password: 'password123'
        });

      expect(newLoginResponse.status).toBe(200);
      const newInfluencerToken = newLoginResponse.body.token;

      // 4. Kod oluştur
      const newCodeResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${newInfluencerToken}`)
        .send({
          code: 'BUSINESS30',
          discount_percentage: 30,
          influencer_id: newInfluencerId
        });

      expect(newCodeResponse.status).toBe(201);
      const newCodeId = newCodeResponse.body.code_id;

      // 5. Satış yap
      const newSaleResponse = await request(app)
        .post('/api/sale')
        .send({
          code: 'BUSINESS30',
          total_amount: 200
        });

      expect(newSaleResponse.status).toBe(201);
      const newSaleId = newSaleResponse.body.sale_id;

      // 6. Bakiye kontrolü
      const balanceResponse = await request(app)
        .get(`/api/balance/${newInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.balance.total_commission).toBeGreaterThan(0);

      // 7. Admin panelinde tüm verileri doğrula
      const adminSalesResponse = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminSalesResponse.status).toBe(200);
      const saleExists = adminSalesResponse.body.sales.some(sale => sale.id === newSaleId);
      expect(saleExists).toBe(true);

      const adminCodesResponse = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminCodesResponse.status).toBe(200);
      const codeExists = adminCodesResponse.body.codes.some(code => code.id === newCodeId);
      expect(codeExists).toBe(true);

      const adminInfluencersResponse = await request(app)
        .get('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminInfluencersResponse.status).toBe(200);
      const influencerExists = adminInfluencersResponse.body.influencers.some(inf => inf.id === newInfluencerId);
      expect(influencerExists).toBe(true);
    });
  });
});