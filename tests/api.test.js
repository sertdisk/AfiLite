const request = require('supertest')
const createApp = require('../src/app')
let app
const knex = require('../src/db/sqlite')

describe('AfiLite API Tests', () => {
  let adminToken

  beforeAll(async() => {
    app = createApp()
    await knex.migrate.latest();
    await knex('sales').del()
    await knex('discount_codes').del()
    await knex('influencers').del()

    const bcrypt = require('bcrypt')
    const passwordHash = await bcrypt.hash('testpassword', 10)

    await knex('influencers').insert({
      full_name: 'Admin User',
      email: 'admin@test.com',
      phone: '+905551234567',
      iban: 'TR330006100519786457841326',
      tax_type: 'individual',
      status: 'approved',
      password_hash: passwordHash,
      role: 'admin'
    })

    const loginResponse = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'testpassword'
      })
    adminToken = loginResponse.body.token
  })

  describe('Influencer Application Tests', () => {
    let testInfluencerId;

    test('POST /api/apply - Başarılı başvuru', async() => {
      const response = await request(app)
        .post('/api/apply')
        .set('Authorization', `Bearer ${adminToken}`)
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
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Başvurunuz otomatik olarak onaylandı')
      expect(response.body.influencer_id).toBeDefined()
      testInfluencerId = response.body.influencer_id;
    })

    test('POST /api/apply - Eksik alan hatası', async() => {
      const response = await request(app)
        .post('/api/apply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Test',
          email: 'invalid-email'
        })

      expect(response.status).toBe(400)
      expect(response.body.errors).toBeDefined()
    })

    test('GET /api/apply - Tüm başvuruları listele', async() => {
      const response = await request(app)
        .get('/api/apply')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.influencers).toBeDefined()
      expect(Array.isArray(response.body.influencers)).toBe(true)
    })

    test('PATCH /api/apply/:id/status - Başvuru durumu güncelleme', async() => {
        const [influencerToUpdate] = await knex('influencers').insert({
            full_name: 'Influencer to Update',
            email: 'update@test.com',
            phone: '+905551234568',
            iban: 'TR11223344556677889900112234',
            tax_type: 'individual',
            status: 'pending',
            role: 'influencer'
        });

      const response = await request(app)
        .patch(`/api/apply/${influencerToUpdate}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Başvuru durumu güncellendi')
    })
  })

  describe('Discount Code, Sale and Balance Tests', () => {
    let testInfluencerId;
    let testCodeId;

    beforeAll(async () => {
        const bcrypt = require('bcrypt')
        const passwordHash = await bcrypt.hash('testpassword', 10)
        const [influencerId] = await knex('influencers').insert({
            full_name: 'Test Influencer For Code',
            email: 'code_influencer@test.com',
            phone: '+905551234569',
            iban: 'TR11223344556677889900112235',
            tax_type: 'individual',
            status: 'approved',
            password_hash: passwordHash,
            role: 'influencer'
        }).returning('id');
        testInfluencerId = influencerId;

        const [codeId] = await knex('discount_codes').insert({
            code: 'SALE_TEST10',
            discount_percentage: 10,
            influencer_id: testInfluencerId,
            is_active: true
        }).returning('id');
        testCodeId = codeId;
    });

    test('POST /api/codes - Kod oluşturma', async() => {
      const response = await request(app)
        .post('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NEWCODE10',
          discount_percentage: 10,
          influencer_id: testInfluencerId
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('İndirim kodu oluşturuldu')
      expect(response.body.code_id).toBeDefined()
    })

    test('GET /api/codes - Tüm kodları listele', async() => {
      const response = await request(app)
        .get('/api/codes')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.codes).toBeDefined()
      expect(Array.isArray(response.body.codes)).toBe(true)
    })

    test('GET /api/codes/:id - Kod detayları', async() => {
      const response = await request(app)
        .get(`/api/codes/${testCodeId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBeDefined()
      expect(response.body.code.id).toBe(testCodeId)
    })

    test('POST /api/sale - Satış kaydetme', async() => {
      const response = await request(app)
        .post('/api/sale')
        .send({
          code: 'SALE_TEST10',
          total_amount: 100
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Satış kaydedildi')
      expect(response.body.sale_id).toBeDefined()
    })

    test('GET /api/sales - Satışları listele', async() => {
      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.sales).toBeDefined()
      expect(Array.isArray(response.body.sales)).toBe(true)
    })

    test('GET /api/sales/stats - Satış istatistikleri', async() => {
      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.stats).toBeDefined()
      expect(response.body.stats.total_sales).toBeDefined()
    })

    test('GET /api/balance/:influencer_id - Bakiye kontrolü', async() => {
      const response = await request(app)
        .get(`/api/balance/${testInfluencerId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.balance).toBeDefined()
      expect(response.body.balance.total_commission).toBeDefined()
    })

    test('GET /api/balance/:influencer_id/history - Bakiye geçmişi', async() => {
      const response = await request(app)
        .get(`/api/balance/${testInfluencerId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.history).toBeDefined()
      expect(Array.isArray(response.body.history)).toBe(true)
    })
  })

  describe('Authentication Tests', () => {
    test('POST /api/login - Admin login', async() => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'testpassword'
        })

      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe('admin@test.com')
    })

    test('POST /api/login - Geçersiz şifre', async() => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Geçersiz email veya şifre')
    })

    test('GET /api/verify - Token doğrulama', async() => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.valid).toBe(true)
    })
  })

  describe('Error Handling Tests', () => {
    test('404 - Geçersiz endpoint', async() => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
    })

    test('401 - Token olmadan korumalı endpoint', async() => {
      const response = await request(app)
        .get('/api/codes')

      expect(response.status).toBe(401)
    })
  })
})
