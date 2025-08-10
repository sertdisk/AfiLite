/**
 * Türkçe: Bu dosya influencer başvuru uçlarını içerir.
 * Güvenlik: Hatalar merkezi handler'a devredilir, PII sızıntısı engellenir.
 * - POST /apply mevcut validasyonu kullanır.
 * - Yönetim (listeleme/güncelleme) uçları requireAdmin ile korunur.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { validateInfluencerApplication } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const { influencerLimiter, influencerLongLimiter } = require('../middleware/rateLimiter');

// Influencer başvurusu oluşturma
router.post('/apply', influencerLimiter, influencerLongLimiter, validateInfluencerApplication, asyncHandler(async (req, res) => {
 const {
   full_name,
   email,
   phone,
   social_media,
   followers,
   iban,
   tax_type = 'individual',
   about = '',
   message = ''
 } = req.body;

 const existingInfluencer = await knex('influencers').where('email', email).first();
 if (existingInfluencer) {
   const err = new Error('Bu email adresi ile zaten başvuru yapılmış');
   err.status = 409;
   throw err;
 }

 // Otomatik onay: yeni başvurular doğrudan approved olarak kaydedilir
 const now = new Date();
 const [influencerId] = await knex('influencers').insert({
   full_name,
   email,
   phone,
   social_media: JSON.stringify(social_media || []),
   followers: parseInt(followers) || 0,
   iban,
   tax_type,
   about,
   message,
   status: 'approved',
   created_at: now,
   updated_at: now
 });

 res.status(201).json({
   message: 'Başvurunuz otomatik olarak onaylandı',
   influencer_id: influencerId,
   status: 'approved'
 });
}));

// Tüm başvuruları listeleme (admin için)
router.get('/apply', requireAdmin, asyncHandler(async (req, res) => {
 const { status, page = 1, limit = 20 } = req.query;
 
 let query = knex('influencers')
   .select(
     'id',
     'full_name',
     'email',
     'phone',
     'followers',
     'status',
     'created_at',
     'updated_at'
   )
   .orderBy('created_at', 'desc');

 if (status) {
   query = query.where('status', status);
 }

 const offset = (page - 1) * limit;
 const influencers = await query.limit(limit).offset(offset);
 
 const total = await knex('influencers')
   .where(builder => {
     if (status) builder.where('status', status);
   })
   .count('* as count')
   .first();

 res.json({
   influencers,
   pagination: {
     page: parseInt(page),
     limit: parseInt(limit),
     total: total.count,
     pages: Math.ceil(total.count / limit)
   }
 });
}));

// Başvuru durumu kontrolü (admin için)
router.get('/apply/:id', requireAdmin, asyncHandler(async (req, res) => {
 const { id } = req.params;
 
 const influencer = await knex('influencers')
   .where('id', id)
   .select(
     'id',
     'full_name',
     'email',
     'phone',
     'social_media',
     'followers',
     'status',
     'about',
     'message',
     'niche',
     'channels',
     'country',
     'website',
     'created_at',
     'updated_at'
   )
   .first();

 if (!influencer) {
   const err = new Error('Başvuru bulunamadı');
   err.status = 404;
   throw err;
 }

 res.json({ influencer });
}));

// Başvuru durumu güncelleme (admin için)
router.patch('/apply/:id/status', requireAdmin, asyncHandler(async (req, res) => {
 const { id } = req.params;
 const { status } = req.body;

 if (!['pending', 'approved', 'rejected'].includes(status)) {
   const err = new Error('Geçersiz durum');
   err.status = 400;
   throw err;
 }

 const updated = await knex('influencers')
   .where('id', id)
   .update({
     status,
     updated_at: new Date()
   });

 if (!updated) {
   const err = new Error('Başvuru bulunamadı');
   err.status = 404;
   throw err;
 }

 res.json({ message: 'Başvuru durumu güncellendi', status });
}));

module.exports = router;