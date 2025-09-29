const request = require('supertest');
const createApp = require('../src/app');
const knex = require('../src/db/sqlite');

let app;
let adminToken;

describe('Influencer API Tests', () => {
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

  describe('Influencer Management', () => {
    let testInfluencerId;

    test('POST /api/influencers - should create a new influencer', async () => {
      const response = await request(app)
        .post('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Test Influencer',
          email: 'test@example.com',
          phone: '+905551234567',
          iban: 'TR320010009999999999',
          tax_type: 'individual',
          status: 'pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Influencer created successfully');
      expect(response.body.influencer.id).toBeDefined();
      testInfluencerId = response.body.influencer.id;
    });

    test('GET /api/influencers - should get all influencers', async () => {
      const response = await request(app)
        .get('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.influencers)).toBe(true);
      expect(response.body.influencers.length).toBeGreaterThan(0);
    });

    test('GET /api/influencers/:id - should get influencer by id', async () => {
      const response = await request(app)
        .get(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.influencer.id).toBe(testInfluencerId);
      expect(response.body.influencer.full_name).toBe('Test Influencer');
    });

    test('PUT /api/influencers/:id - should update influencer', async () => {
      const response = await request(app)
        .put(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Updated Influencer',
          email: 'updated@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Influencer updated successfully');
      expect(response.body.influencer.full_name).toBe('Updated Influencer');
    });

    test('DELETE /api/influencers/:id - should delete influencer', async () => {
      const response = await request(app)
        .delete(`/api/influencers/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Influencer deleted successfully');
    });
  });

 describe('Influencer Authentication', () => {
    test('POST /api/auth/login - should login influencer', async () => {
      // First create an influencer
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const [influencerId] = await knex('influencers').insert({
        full_name: 'Test Login User',
        email: 'login@test.com',
        phone: '+905551234567',
        iban: 'TR330006100519786457841326',
        tax_type: 'individual',
        status: 'approved',
        password_hash: passwordHash,
        role: 'influencer'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('login@test.com');
    });

    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('Influencer Validation', () => {
    test('POST /api/influencers - should validate required fields', async () => {
      const response = await request(app)
        .post('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: '',
          email: 'invalid-email',
          phone: '',
          iban: '',
          tax_type: '',
          status: 'pending'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('POST /api/influencers - should validate email format', async () => {
      const response = await request(app)
        .post('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Test User',
          email: 'invalid-email',
          phone: '+905551234567',
          iban: 'TR330006100519786457841326',
          tax_type: 'individual',
          status: 'pending'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'email')).toBe(true);
    });

    test('POST /api/influencers - should validate phone format', async () => {
      const response = await request(app)
        .post('/api/influencers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Test User',
          email: 'test@example.com',
          phone: 'invalid-phone',
          iban: 'TR330006100519786457841326',
          tax_type: 'individual',
          status: 'pending'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(error => error.field === 'phone')).toBe(true);
    });
  });

  describe('Unauthorized Access', () => {
    test('GET /api/influencers - should require authentication', async () => {
      const response = await request(app)
        .get('/api/influencers');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('GET /api/influencers - should require admin role', async () => {
      // Create a regular influencer token
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('password123', 10);
      
      await knex('influencers').insert({
        full_name: 'Regular User',
        email: 'regular@test.com',
        phone: '+905551234567',
        iban: 'TR330006100519786457841326',
        tax_type: 'individual',
        status: 'approved',
        password_hash: passwordHash,
        role: 'influencer'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regular@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .get('/api/influencers')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });
});