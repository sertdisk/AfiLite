/**
 * Admin ayarları endpoint'leri
 * - Komisyon oran ayarlama
 * - Sözleşme yönetimi
 */
const router = require('express').Router()
const knex = require('../db/sqlite')
const { asyncHandler } = require('../middleware/errorHandler')
const { requireAdmin } = require('../middleware/auth')

// Komisyon oranlarını güncelle (ADMIN)
router.post('/commission-rates', requireAdmin, asyncHandler(async(req, res) => {
  const { discount_pct, commission_pct } = req.body

  // Validasyon
  if (discount_pct === undefined || commission_pct === undefined) {
    const err = new Error('İndirim ve komisyon yüzdesi gerekli')
    err.status = 400
    throw err
  }

  if (discount_pct < 1 || discount_pct > 100 || commission_pct < 1 || commission_pct > 100) {
    const err = new Error('Yüzde değerleri 1-100 arasında olmalıdır')
    err.status = 400
    throw err
  }

  // Tüm aktif kodların oranlarını güncelle
  await knex('discount_codes')
    .where('is_active', true)
    .update({
      discount_pct: discount_pct,
      commission_pct: commission_pct
    })

  res.json({ 
    message: 'Komisyon oranları başarıyla güncellendi',
    updated_codes_count: await knex('discount_codes').where('is_active', true).count({ count: '*' }).first().then(r => r.count)
  })
}))

// Aktif sözleşmeyi getir (public - kayıt olmadan da erişilebilir)
router.get('/contract/active', asyncHandler(async(req, res) => {
  const contract = await knex('contracts')
    .where('is_active', true)
    .first()

  if (!contract) {
    const err = new Error('Aktif sözleşme bulunamadı')
    err.status = 404
    throw err
  }

  res.json(contract)
}))

module.exports = router