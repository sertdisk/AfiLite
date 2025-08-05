/**
 * Türkçe: Bu dosya indirim kodu CRUD uçlarını içerir.
 * Güvenlik: Hata yönetimi merkezi handler'a devredildi (PII sızıntısı engeli).
 * - try/catch blokları kaldırıldı, [middleware/errorHandler.js:59-62] içindeki asyncHandler ile sarıldı.
 * - Mutasyon uçları [middleware/auth.js:42-48 requireAdmin()] ile korundu.
 * - Girdi doğrulama [middleware/validation.js] bağlandı.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const { validateDiscountCode } = require('../middleware/validation');

// Tüm indirim kodlarını listele
router.get('/codes', asyncHandler(async (req, res) => {
 const codes = await knex('discount_codes')
   .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
   .select(
     'discount_codes.id',
     'discount_codes.code',
     'discount_codes.discount_pct',
     'discount_codes.commission_pct',
     'discount_codes.is_active',
     'discount_codes.created_at',
     'influencers.full_name as influencer_name',
     'influencers.email as influencer_email'
   )
   .orderBy('discount_codes.created_at', 'desc');

 res.json({ codes });
}));

// Tek bir kod detayını getir
router.get('/codes/:id', asyncHandler(async (req, res) => {
 const code = await knex('discount_codes')
   .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
   .select(
     'discount_codes.*',
     'influencers.full_name as influencer_name',
     'influencers.email as influencer_email'
   )
   .where('discount_codes.id', req.params.id)
   .first();
 
 if (!code) {
   const err = new Error('Kod bulunamadı');
   err.status = 404;
   throw err;
 }
 
 res.json({ code });
}));

// Yeni indirim kodu oluştur
router.post('/codes', requireAdmin, validateDiscountCode, asyncHandler(async (req, res) => {
 const { influencer_id, code, discount_percentage, commission_pct = 10 } = req.body;

 // Influencer kontrolü
 const influencer = await knex('influencers').where('id', influencer_id).first();
 if (!influencer) {
   const err = new Error('Influencer bulunamadı');
   err.status = 404;
   throw err;
 }

 const [id] = await knex('discount_codes').insert({
   influencer_id,
   code: code.toUpperCase(),
   discount_pct: discount_percentage,
   commission_pct,
   is_active: true
 });
 
 const newCode = await knex('discount_codes')
   .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
   .select(
     'discount_codes.*',
     'influencers.full_name as influencer_name'
   )
   .where('discount_codes.id', id)
   .first();
 
 res.status(201).json({
   message: 'İndirim kodu oluşturuldu',
   code_id: id,
   code: newCode
 });
}));

// Kod güncelle
router.put('/codes/:id', requireAdmin, asyncHandler(async (req, res) => {
 const { discount_pct, commission_pct, is_active } = req.body;
 
 const code = await knex('discount_codes').where('id', req.params.id).first();
 if (!code) {
   const err = new Error('Kod bulunamadı');
   err.status = 404;
   throw err;
 }
 
 if (discount_pct && (discount_pct < 1 || discount_pct > 100)) {
   const err = new Error('İndirim yüzdesi 1-100 arasında olmalı');
   err.status = 400;
   throw err;
 }
 
 if (commission_pct && (commission_pct < 1 || commission_pct > 100)) {
   const err = new Error('Komisyon yüzdesi 1-100 arasında olmalı');
   err.status = 400;
   throw err;
 }
 
 await knex('discount_codes')
   .where('id', req.params.id)
   .update({
     discount_pct: discount_pct || code.discount_pct,
     commission_pct: commission_pct || code.commission_pct,
     is_active: is_active !== undefined ? is_active : code.is_active
   });
 
 const updatedCode = await knex('discount_codes')
   .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
   .select(
     'discount_codes.*',
     'influencers.full_name as influencer_name'
   )
   .where('discount_codes.id', req.params.id)
   .first();
 
 res.json(updatedCode);
}));

// Kod sil (soft delete yerine tamamen sil)
router.delete('/codes/:id', requireAdmin, asyncHandler(async (req, res) => {
 const deleted = await knex('discount_codes')
   .where('id', req.params.id)
   .del();
 
 if (!deleted) {
   const err = new Error('Kod bulunamadı');
   err.status = 404;
   throw err;
 }
 
 res.json({ message: 'Kod başarıyla silindi' });
}));

module.exports = router;