/**
 * Türkçe: Bu dosya influencer kullanıcılar için özet bilgi endpoint'ini içerir.
 * Güvenlik: authenticateToken middleware'i ile korunmuştur.
 */
const router = require('express').Router()
const knex = require('../db/sqlite')
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticateToken } = require('../middleware/auth')

/**
 * Influencer kendi özet bilgilerini alır
 * GET /api/influencer-summary
 */
router.get('/', authenticateToken, asyncHandler(async(req, res) => {
  const userId = req.user.userId
  
  // Kullanıcının influencer kaydını getir
  const influencer = await knex('influencers')
    .where('id', userId)
    .where('role', 'influencer')
    .first()
    
  if (!influencer) {
    // Eğer influencer değilse, admin olabilir
    const admin = await knex('influencers')
      .where('id', userId)
      .where('role', 'admin')
      .first()
      
    if (admin) {
      // Admin için farklı bir yanıt döndürebiliriz
      return res.json({
        role: 'admin',
        email: admin.email,
        created_at: admin.created_at
      })
    }
    
    const err = new Error('Kullanıcı bulunamadı')
    err.status = 404
    throw err
  }

  // Influencer için özet bilgileri döndür
  res.json({
    role: 'influencer',
    status: influencer.status,
    created_at: influencer.created_at,
    days_since_application: Math.floor((new Date() - new Date(influencer.created_at)) / (1000 * 60 * 60 * 24)),
    full_name: influencer.full_name,
    email: influencer.email
  })
}))

module.exports = router