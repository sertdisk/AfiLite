const request = require('supertest');
const createApp = require('../src/app');
const knex = require('../src/db/sqlite');

let app;
let adminToken;

describe('End-to-End Admin Flow Tests', () => {
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
      phone: '+90551234567',
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

  describe('Admin Dashboard and Overview Flow', () => {
    test('Admin dashboard data retrieval', async () => {
      // 1. Admin dashboard verilerini al
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.summary).toBeDefined();
      expect(dashboardResponse.body.summary.total_influencers).toBeDefined();
      expect(dashboardResponse.body.summary.total_sales).toBeDefined();
      expect(dashboardResponse.body.summary.total_commission).toBeDefined();
      expect(dashboardResponse.body.summary.pending_applications).toBeDefined();

      // 2. Admin istatistiklerini al
      const statsResponse = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(20);
      expect(statsResponse.body.stats).toBeDefined();
      expect(statsResponse.body.stats.monthly_sales).toBeDefined();
      expect(statsResponse.body.stats.top_influencers).toBeDefined();
      expect(statsResponse.body.stats.commission_trends).toBeDefined();
    });

    test('Admin reporting and analytics flow', async () => {
      // 1. Genel raporlar
      const reportsResponse = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportsResponse.status).toBe(200);
      expect(reportsResponse.body.reports).toBeDefined();

      // 2. Zaman aralığına göre satış raporları
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 1000).toISOString().split('T')[0]; // 30 gün önce
      const dateTo = new Date().toISOString().split('T')[0]; // bugün

      const dateRangeResponse = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date_from: dateFrom, date_to: dateTo });

      expect(dateRangeResponse.status).toBe(200);
      expect(dateRangeResponse.body.reports).toBeDefined();

      // 3. Influencer bazlı raporlar
      const influencerReportResponse = await request(app)
        .get('/api/admin/reports/influencer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(influencerReportResponse.status).toBe(200);
      expect(Array.isArray(influencerReportResponse.body.reports)).toBe(true);
    });
  });

  describe('Influencer Management Flow', () => {
    let testInfluencerId;

    test('Complete influencer lifecycle management', async () => {
      // 1. Yeni influencer oluştur
      const createResponse = await request(app)
        .post('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Admin Created Influencer',
          email: 'admin-created@test.com',
          phone: '+905551234569',
          iban: 'TR320010009999',
          tax_type: 'individual',
          status: 'pending'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.message).toBe('Influencer created successfully');
      testInfluencerId = createResponse.body.influencer.id;

      // 2. Influencer listele
      const listResponse = await request(app)
        .get('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listResponse.status).toBe(200);
      const influencerExists = listResponse.body.influencers.some(inf => inf.id === testInfluencerId);
      expect(influencerExists).toBe(true);

      // 3. Influencer detaylarını al
      const detailResponse = await request(app)
        .get(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.influencer.id).toBe(testInfluencerId);
      expect(detailResponse.body.influencer.email).toBe('admin-created@test.com');

      // 4. Influencer güncelle
      const updateResponse = await request(app)
        .put(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Updated Admin Created Influencer',
          email: 'updated-admin-created@test.com',
          status: 'approved'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.message).toBe('Influencer updated successfully');
      expect(updateResponse.body.influencer.full_name).toBe('Updated Admin Created Influencer');
      expect(updateResponse.body.influencer.status).toBe('approved');

      // 5. Influencer sil
      const deleteResponse = await request(app)
        .delete(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Influencer deleted successfully');
    });

    test('Influencer application management', async () => {
      // 1. Başvuru yap
      const applyResponse = await request(app)
        .post('/api/apply')
        .send({
          full_name: 'Application Test Influencer',
          email: 'application@test.com',
          phone: '+905551234570',
          iban: 'TR320010009999998',
          tax_type: 'individual',
          about: 'Application test',
          message: 'Application test message'
        });

      expect(applyResponse.status).toBe(201);
      const applicationId = applyResponse.body.influencer_id;

      // 2. Tüm başvuruları listele
      const applicationsResponse = await request(app)
        .get('/api/apply')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(applicationsResponse.status).toBe(200);
      expect(Array.isArray(applicationsResponse.body.influencers)).toBe(true);
      const applicationExists = applicationsResponse.body.influencers.some(app => app.id === applicationId);
      expect(applicationExists).toBe(true);

      // 3. Başvuru durumu güncelle
      const updateStatusResponse = await request(app)
        .patch(`/api/apply/${applicationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(updateStatusResponse.status).toBe(200);
      expect(updateStatusResponse.body.message).toBe('Başvuru durumu güncellendi');
      expect(updateStatusResponse.body.influencer.status).toBe('approved');
    });
  });

  describe('Sales and Commission Management Flow', () => {
    let testInfluencerId;
    let testSaleId;

    beforeAll(async () => {
      // Test influencer oluştur
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('password123', 10);
      const [influencerId] = await knex('influencers').insert({
        full_name: 'Sales Test Influencer',
        email: 'sales-test@test.com',
        phone: '+90551234571',
        iban: 'TR320010009999997',
        tax_type: 'individual',
        status: 'approved',
        password_hash: passwordHash,
        role: 'influencer'
      });

      testInfluencerId = influencerId;
    });

    test('Complete sales management flow', async () => {
      // 1. Admin tarafından hızlı satış oluştur
      const quickSaleResponse = await request(app)
        .post('/api/admin/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          influencer_id: testInfluencerId,
          code: 'QUICKSALE25',
          total_amount: 300,
          customer_url: 'https://example.com/order/456',
          product: 'Quick Sale Product'
        });

      expect(quickSaleResponse.status).toBe(201);
      expect(quickSaleResponse.body.message).toBe('Satış kaydedildi');
      testSaleId = quickSaleResponse.body.sale_id;

      // 2. Tüm satışları listele
      const allSalesResponse = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allSalesResponse.status).toBe(200);
      expect(Array.isArray(allSalesResponse.body.sales)).toBe(true);
      const saleExists = allSalesResponse.body.sales.some(sale => sale.id === testSaleId);
      expect(saleExists).toBe(true);

      // 3. Influencer bazlı satışları listele
      const influencerSalesResponse = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ influencer_id: testInfluencerId });

      expect(influencerSalesResponse.status).toBe(200);
      expect(Array.isArray(influencerSalesResponse.body.sales)).toBe(true);
      const influencerSaleExists = influencerSalesResponse.body.sales.some(sale => sale.id === testSaleId);
      expect(influencerSaleExists).toBe(true);

      // 4. Satış detaylarını al
      const saleDetailResponse = await request(app)
        .get(`/api/sales/${testSaleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(saleDetailResponse.status).toBe(200);
      expect(saleDetailResponse.body.sale.id).toBe(testSaleId);
      expect(saleDetailResponse.body.sale.influencer_id).toBe(testInfluencerId);

      // 5. Satış güncelle
      const updateSaleResponse = await request(app)
        .put(`/api/sales/${testSaleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          total_amount: 350,
          customer_url: 'https://example.com/order/456-updated',
          product: 'Updated Quick Sale Product'
        });

      expect(updateSaleResponse.status).toBe(200);
      expect(updateSaleResponse.body.message).toBe('Satış güncellendi');
      expect(updateSaleResponse.body.sale.total_amount).toBe(350);

      // 6. Satış sil
      const deleteSaleResponse = await request(app)
        .delete(`/api/sales/${testSaleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteSaleResponse.status).toBe(200);
      expect(deleteSaleResponse.body.message).toBe('Satış silindi');
    });

    test('Commission management and calculations', async () => {
      // 1. Komisyon oranlarını al
      const commissionRatesResponse = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(commissionRatesResponse.status).toBe(200);
      expect(commissionRatesResponse.body.commission_rates).toBeDefined();

      // 2. Komisyon oranlarını güncelle
      const updateCommissionResponse = await request(app)
        .put('/api/commissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          default_rate: 15,
          premium_rate: 20,
          enterprise_rate: 25
        });

      expect(updateCommissionResponse.status).toBe(200);
      expect(updateCommissionResponse.body.message).toBe('Komisyon oranları güncellendi');

      // 3. Belirli bir influencer için komisyon hesaplamalarını al
      const influencerCommissionResponse = await request(app)
        .get(`/api/commissions/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(influencerCommissionResponse.status).toBe(200);
      expect(influencerCommissionResponse.body.commissions).toBeDefined();
    });
  });

  describe('Discount Code Management Flow', () => {
    let testCodeId;

    test('Complete discount code management flow', async () => {
      // 1. Admin tarafından kod oluştur
      const createCodeResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ADMINCODE35',
          discount_percentage: 35,
          influencer_id: testInfluencerId,
          is_active: true
        });

      expect(createCodeResponse.status).toBe(201);
      expect(createCodeResponse.body.message).toBe('İndirim kodu oluşturuldu');
      testCodeId = createCodeResponse.body.code_id;

      // 2. Tüm kodları listele
      const allCodesResponse = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allCodesResponse.status).toBe(200);
      expect(Array.isArray(allCodesResponse.body.codes)).toBe(true);
      const codeExists = allCodesResponse.body.codes.some(code => code.id === testCodeId);
      expect(codeExists).toBe(true);

      // 3. Kod detaylarını al
      const codeDetailResponse = await request(app)
        .get(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(codeDetailResponse.status).toBe(200);
      expect(codeDetailResponse.body.code.id).toBe(testCodeId);
      expect(codeDetailResponse.body.code.code).toBe('ADMINCODE35');

      // 4. Kod güncelle
      const updateCodeResponse = await request(app)
        .put(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          discount_percentage: 40,
          is_active: false
        });

      expect(updateCodeResponse.status).toBe(200);
      expect(updateCodeResponse.body.message).toBe('İndirim kodu güncellendi');
      expect(updateCodeResponse.body.code.discount_percentage).toBe(40);
      expect(updateCodeResponse.body.code.is_active).toBe(false);

      // 5. Kod sil
      const deleteCodeResponse = await request(app)
        .delete(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteCodeResponse.status).toBe(200);
      expect(deleteCodeResponse.body.message).toBe('İndirim kodu silindi');
    });
  });

  describe('Payout Management Flow', () => {
    let payoutId;

    test('Complete payout management flow', async () => {
      // 1. Ödeme talebi oluştur
      const createPayoutResponse = await request(app)
        .post('/api/payouts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          influencer_id: testInfluencerId,
          amount: 100,
          status: 'pending',
          notes: 'Test payout for E2E flow'
        });

      expect(createPayoutResponse.status).toBe(201);
      expect(createPayoutResponse.body.message).toBe('Ödeme talebi oluşturuldu');
      payoutId = createPayoutResponse.body.payout_id;

      // 2. Tüm ödeme taleplerini listele
      const allPayoutsResponse = await request(app)
        .get('/api/payouts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allPayoutsResponse.status).toBe(200);
      expect(Array.isArray(allPayoutsResponse.body.payouts)).toBe(true);
      const payoutExists = allPayoutsResponse.body.payouts.some(payout => payout.id === payoutId);
      expect(payoutExists).toBe(true);

      // 3. Ödeme detaylarını al
      const payoutDetailResponse = await request(app)
        .get(`/api/payouts/${payoutId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(payoutDetailResponse.status).toBe(20);
      expect(payoutDetailResponse.body.payout.id).toBe(payoutId);
      expect(payoutDetailResponse.body.payout.amount).toBe(100);
      expect(payoutDetailResponse.body.payout.status).toBe('pending');

      // 4. Ödeme durumu güncelle
      const updatePayoutResponse = await request(app)
        .put(`/api/payouts/${payoutId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          notes: 'Test payout completed'
        });

      expect(updatePayoutResponse.status).toBe(20);
      expect(updatePayoutResponse.body.message).toBe('Ödeme güncellendi');
      expect(updatePayoutResponse.body.payout.status).toBe('completed');

      // 5. Ödeme taleplerini dışa aktar
      const exportPayoutsResponse = await request(app)
        .get('/api/payouts/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'json' });

      expect(exportPayoutsResponse.status).toBe(200);
      expect(exportPayoutsResponse.headers['content-type']).toContain('application/json');
    });
  });

  describe('System Settings and Configuration Flow', () => {
    test('Admin system settings management', async () => {
      // 1. Sistem ayarlarını al
      const settingsResponse = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(settingsResponse.status).toBe(200);
      expect(settingsResponse.body.settings).toBeDefined();

      // 2. Komisyon ayarlarını al
      const commissionSettingsResponse = await request(app)
        .get('/api/settings/commission-rates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(commissionSettingsResponse.status).toBe(200);
      expect(commissionSettingsResponse.body.commission_rates).toBeDefined();

      // 3. Komisyon ayarlarını güncelle
      const updateCommissionSettingsResponse = await request(app)
        .put('/api/settings/commission-rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          default_rate: 12,
          premium_rate: 18,
          enterprise_rate: 22
        });

      expect(updateCommissionSettingsResponse.status).toBe(200);
      expect(updateCommissionSettingsResponse.body.message).toBe('Komisyon oranları güncellendi');
    });
  });
});