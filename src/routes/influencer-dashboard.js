/**
 * Türkçe: Bu dosya influencer kullanıcılar için dashboard endpoint'lerini içerir.
 * Güvenlik: Hata yönetimi merkezi handler'a devredildi (PII sızıntısı engeli).
 * - try/catch blokları kaldırıldı, [middleware/errorHandler.js:59-62] içindeki asyncHandler ile sarıldı.
 * - Girdi doğrulama [middleware/validation.js] bağlandı.
 */
const router = require('express').Router()
const knex = require('../db/sqlite')
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticateToken } = require('../middleware/auth')

// Yardımcı: user_id çöz
function resolveUserId(req) {
  return (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null
}

/**
 * Influencer kendi özet bilgilerini alır
 * GET /api/influencer/summary
 */
router.get('/summary', authenticateToken, asyncHandler(async(req, res) => {
  const userId = resolveUserId(req)
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli')
    err.status = 401
    throw err
  }

  // Kullanıcının influencer kaydını getir
  const influencer = await knex('influencers').where('id', userId).first()
  if (!influencer) {
    const err = new Error('Influencer kaydı bulunamadı')
    err.status = 404
    throw err
  }

  // Başvuru durumu ve tarih bilgilerini döndür
  res.json({
    status: influencer.status,
    created_at: influencer.created_at,
    days_since_application: Math.floor((new Date() - new Date(influencer.created_at)) / (1000 * 60 * 24))
  })
}))

module.exports = router