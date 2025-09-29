const request = require('supertest');
const createApp = require('../src/app');
const knex = require('../src/db/sqlite');

let app;
let adminToken;
let influencerToken;
let testInfluencerId;
let testCodeId;

describe('Discount Codes API Tests', () => {
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
      phone: '+9051234567',
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

  describe('Discount Code Creation', () => {
    test('POST /api/codes - should create a new discount code', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'TESTCODE10',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('İndirim kodu oluşturuldu');
      expect(response.body.code_id).toBeDefined();
      testCodeId = response.body.code_id;
    });

    test('POST /api/codes - should validate discount percentage range', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'INVALIDPERC',
          discount_percentage: 150, // Invalid percentage
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'discount_percentage')).toBe(true);
    });

    test('POST /api/codes - should validate code uniqueness', async () => {
      // First create a code
      await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'UNIQUECODE',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      // Try to create the same code again
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'UNIQUECODE',
          discount_percentage: 15,
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bu kod zaten kullanımda');
    });

    test('POST /api/codes - should validate required fields', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: '',
          discount_percentage: '',
          influencer_id: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Discount Code Retrieval', () => {
    test('GET /api/codes - should get all discount codes for admin', async () => {
      const response = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.codes)).toBe(true);
      expect(response.body.codes.length).toBeGreaterThan(0);
    });

    test('GET /api/codes - should get discount codes for specific influencer', async () => {
      const response = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.codes)).toBe(true);
      response.body.codes.forEach(code => {
        expect(code.influencer_id).toBe(testInfluencerId);
      });
    });

    test('GET /api/codes/my - should get influencer\'s own codes', async () => {
      const response = await request(app)
        .get('/api/codes/my')
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.codes)).toBe(true);
      response.body.codes.forEach(code => {
        expect(code.influencer_id).toBe(testInfluencerId);
      });
    });

    test('GET /api/codes/:id - should get specific discount code', async () => {
      const response = await request(app)
        .get(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.id).toBe(testCodeId);
      expect(response.body.code).toBe('TESTCODE10');
    });

    test('GET /api/codes/:id - should validate code ownership', async () => {
      // Create another influencer
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('password123', 10);
      const [otherInfluencerId] = await knex('influencers').insert({
        full_name: 'Other Influencer',
        email: 'other@test.com',
        phone: '+90551234568',
        iban: 'TR330006100519786457841327',
        tax_type: 'individual',
        status: 'approved',
        password_hash: passwordHash,
        role: 'influencer'
      });

      // Create a code for the other influencer
      const codeResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'OTHERCODE20',
          discount_percentage: 20,
          influencer_id: otherInfluencerId
        });

      const response = await request(app)
        .get(`/api/codes/${codeResponse.body.code_id}`)
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Bu koda erişim izniniz yok');
    });
  });

  describe('Discount Code Search', () => {
    test('GET /api/codes/search/:code - should find discount code by code string', async () => {
      const response = await request(app)
        .get('/api/codes/search/TESTCODE10');

      expect(response.status).toBe(200);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.code).toBe('TESTCODE10');
      expect(response.body.code.is_active).toBe(true);
    });

    test('GET /api/codes/search/:code - should return 404 for non-existent code', async () => {
      const response = await request(app)
        .get('/api/codes/search/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Kod bulunamadı');
    });

    test('GET /api/codes/search/:code - should return 400 for inactive code', async () => {
      // Create an inactive code
      await knex('discount_codes').insert({
        code: 'INACTIVECODE',
        discount_percentage: 10,
        influencer_id: testInfluencerId,
        is_active: false
      });

      const response = await request(app)
        .get('/api/codes/search/INACTIVECODE');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bu kod artık aktif değil');
    });
  });

  describe('Discount Code Management', () => {
    test('PUT /api/codes/:id - should update discount code', async () => {
      const response = await request(app)
        .put(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          discount_percentage: 15,
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('İndirim kodu güncellendi');
      expect(response.body.code.discount_percentage).toBe(15);
      expect(response.body.code.is_active).toBe(false);
    });

    test('PUT /api/codes/:id - should validate update permissions', async () => {
      // Use other influencer token to update code owned by first influencer
      const otherInfluencerLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .put(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${otherInfluencerLogin.body.token}`)
        .send({
          discount_percentage: 20
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Bu koda erişim izniniz yok');
    });

    test('DELETE /api/codes/:id - should delete discount code', async () => {
      // Create a new code to delete
      const createResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'DELETETEST',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      const response = await request(app)
        .delete(`/api/codes/${createResponse.body.code_id}`)
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('İndirim kodu silindi');
    });

    test('DELETE /api/codes/:id - should validate delete permissions', async () => {
      // Create a code with other influencer
      const otherInfluencerLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@test.com',
          password: 'password123'
        });

      const createResponse = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${otherInfluencerLogin.body.token}`)
        .send({
          code: 'DELETEOWNED',
          discount_percentage: 10,
          influencer_id: 2 // other influencer id
        });

      // Try to delete with first influencer token
      const response = await request(app)
        .delete(`/api/codes/${createResponse.body.code_id}`)
        .set('Authorization', `Bearer ${influencerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Bu koda erişim izniniz yok');
    });
  });

  describe('Code Validation', () => {
    test('POST /api/codes - should validate code format', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'A', // Too short
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'code')).toBe(true);
    });

    test('POST /api/codes - should validate discount percentage format', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'VALIDCODE',
          discount_percentage: 'invalid', // Invalid format
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'discount_percentage')).toBe(true);
    });

    test('POST /api/codes - should validate influencer exists', async () => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({
          code: 'VALIDCODE',
          discount_percentage: 10,
          influencer_id: 9999 // Non-existent influencer
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Influencer not found');
    });
  });

  describe('Unauthorized Access', () => {
    test('POST /api/codes - should require authentication', async () => {
      const response = await request(app)
        .post('/api/codes')
        .send({
          code: 'UNAUTHCODE',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        });

      expect(response.status).toBe(401);
    });

    test('GET /api/codes - should require authentication', async () => {
      const response = await request(app)
        .get('/api/codes');

      expect(response.status).toBe(401);
    });

    test('GET /api/codes/my - should require authentication', async () => {
      const response = await request(app)
        .get('/api/codes/my');

      expect(response.status).toBe(401);
    });
  });
});