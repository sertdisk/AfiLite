const request = require('supertest');
const createApp = require('../src/app');
const knex = require('../src/db/sqlite');

let app;
let adminToken;
let influencerToken;
let testInfluencerId;
let testCodeId;
let testSaleId;

describe('Sales API Tests', () => {
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

    // Test influencer oluştur
    const influencerPasswordHash = await bcrypt.hash('password123', 10);
    const [influencerId] = await knex('influencers').insert({
      full_name: 'Test Influencer',
      email: 'influencer@test.com',
      phone: '+90551234567',
      iban: 'TR330006100519786457841326',
      tax_type: 'individual',
      status: 'approved',
      password_hash: influencerPasswordHash,
      role: 'influencer'
    });

    testInfluencerId = influencerId;

    // Test discount code oluştur
    const [codeId] = await knex('discount_codes').insert({
      code: 'TESTSALE10',
      discount_percentage: 10,
      influencer_id: testInfluencerId,
      is_active: true
    });

    testCodeId = codeId;

    // Influencer login token
    const influencerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'influencer@test.com',
        password: 'password123'
      });
    
    influencerToken = influencerLoginResponse.body.token;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Sale Creation and Management', () => {
    test('POST /api/sale - should create a new sale with valid code', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'TESTSALE10',
          total_amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Satış kaydedildi');
      expect(response.body.sale_id).toBeDefined();
      testSaleId = response.body.sale_id;
    });

    test('POST /api/sale - should fail with invalid code', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'INVALIDCODE',
          total_amount: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Geçersiz indirim kodu');
    });

    test('POST /api/sale - should fail with inactive code', async () => {
      // Create an inactive code
      await knex('discount_codes').insert({
        code: 'INACTIVE10',
        discount_percentage: 10,
        influencer_id: testInfluencerId,
        is_active: false
      });

      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'INACTIVE10',
          total_amount: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Geçersiz indirim kodu');
    });

    test('POST /api/sale - should fail with invalid amount', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'TESTSALE10',
          total_amount: -50
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'total_amount')).toBe(true);
    });
  });

  describe('Sales Retrieval', () => {
    test('GET /api/sales - should get all sales for admin', async () => {
      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sales)).toBe(true);
      expect(response.body.sales.length).toBeGreaterThan(0);
    });

    test('GET /api/sales - should get sales for specific influencer', async () => {
      const response = await request(app)
        .get(`/api/sales?influencer_id=${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sales)).toBe(true);
      response.body.sales.forEach(sale => {
        expect(sale.influencer_id).toBe(testInfluencerId);
      });
    });

    test('GET /api/sales - should get sales with date filters', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/sales?start_date=${today}&end_date=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sales)).toBe(true);
    });

    test('GET /api/sales - should require admin access', async () => {
      const response = await request(app)
        .get('/api/sales');

      expect(response.status).toBe(401);
    });
  });

  describe('Sales Statistics', () => {
    test('GET /api/sales/stats - should get sales statistics', async () => {
      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total_sales).toBeDefined();
      expect(response.body.stats.total_amount).toBeDefined();
      expect(response.body.stats.commission_amount).toBeDefined();
    });

    test('GET /api/sales/stats - should get influencer sales statistics', async () => {
      const response = await request(app)
        .get(`/api/sales/stats?influencer_id=${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total_sales).toBeDefined();
    });
 });

  describe('Sale Validation', () => {
    test('POST /api/sale - should validate required fields', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: '',
          total_amount: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('POST /api/sale - should validate code format', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: '123', // Too short
          total_amount: 100
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'code')).toBe(true);
    });

    test('POST /api/sale - should validate amount format', async () => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'TESTSALE10',
          total_amount: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'total_amount')).toBe(true);
    });
  });

  describe('Quick Sale Creation (Admin)', () => {
    test('POST /api/admin/sales - should create quick sale for admin', async () => {
      const response = await request(app)
        .post('/api/admin/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          influencer_id: testInfluencerId,
          code: 'QUICKSALE15',
          total_amount: 200,
          customer_url: 'https://example.com/order/123',
          product: 'Test Product'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Satış kaydedildi');
      expect(response.body.sale_id).toBeDefined();
    });

    test('POST /api/admin/sales - should validate admin access', async () => {
      const response = await request(app)
        .post('/api/admin/sales')
        .send({
          influencer_id: testInfluencerId,
          code: 'QUICKSALE20',
          total_amount: 150
        });

      expect(response.status).toBe(401);
    });

    test('POST /api/admin/sales - should validate influencer exists', async () => {
      const response = await request(app)
        .post('/api/admin/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          influencer_id: 9999, // Non-existent influencer
          code: 'QUICKSALE25',
          total_amount: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Influencer not found');
    });
  });

  describe('Sales Export', () => {
    test('GET /api/sales/export - should export sales data', async () => {
      const response = await request(app)
        .get('/api/sales/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('GET /api/sales/export - should support CSV export', async () => {
      const response = await request(app)
        .get('/api/sales/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    test('GET /api/sales/export - should validate export format', async () => {
      const response = await request(app)
        .get('/api/sales/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'xml' }); // Unsupported format

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid export format. Supported formats: json, csv');
    });
  });
});