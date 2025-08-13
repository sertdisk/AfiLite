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
const { requireAdmin, authenticateToken } = require('../middleware/auth');
const { validateDiscountCode } = require('../middleware/validation');

/**
* Influencer kendi kodlarını listeler (AUTH gerekli)
* Not: Sadece kendi influencer_id'si ile ilişkilendirilmiş kodlar döner
*/
router.get('/codes/me', authenticateToken, asyncHandler(async (req, res) => {
 const userId = (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null;
 if (!userId) {
   const err = new Error('Kimlik doğrulama gerekli');
   err.status = 401;
   throw err;
 }
 const infl = await knex('influencers').where('id', userId).first();
 if (!infl) {
   const err = new Error('Influencer kaydı bulunamadı');
   err.status = 404;
   throw err;
 }
 const codes = await knex('discount_codes')
   .where('influencer_id', infl.id)
   .orderBy('created_at', 'desc');
 res.json({ codes });
}));

// Tüm indirim kodlarını listele (Admin)
router.get('/codes', requireAdmin, asyncHandler(async (req, res) => {
  const query = knex('discount_codes')
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
  
  // Status parametresine göre filtreleme
  const { status } = req.query;
  if (status === 'pending') {
    query.where('discount_codes.is_active', false);
  } else if (status === 'active') {
    query.where('discount_codes.is_active', true);
  }

  const codes = await query;
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

// Yeni indirim kodu oluştur (ADMIN) - Admin bir influencere sınırsız sayıda ek kod ekleyebilir
router.post('/codes', requireAdmin, validateDiscountCode, asyncHandler(async (req, res) => {
const { influencer_id, code, discount_percentage, commission_pct = 10 } = req.body;

// Influencer kontrolü
const influencer = await knex('influencers').where('id', influencer_id).first();
if (!influencer) {
  const err = new Error('Influencer bulunamadı');
  err.status = 404;
  throw err;
}

// Benzersiz kod zorunluluğu
const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
if (normalized.length < 4 || normalized.length > 16) {
  const err = new Error('Kod 4-16 karakter arasında A-Z veya 0-9 olmalıdır');
  err.status = 400;
  throw err;
}
const exists = await knex('discount_codes').where('code', normalized).first();
if (exists) {
  const err = new Error('Kod zaten kullanılıyor');
  err.status = 409;
  throw err;
}

const [id] = await knex('discount_codes').insert({
  influencer_id,
  code: normalized,
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

/**
* Influencer'ın kendi adına kod oluşturması
* Kurallar:
* - Auth gerekli
* - Influencer status = approved olmalı
* - Influencer başına en az 1 kod hakkı var; eğer hiç kodu yoksa bir tane ücretsiz oluşturabilir
* - Eğer influencer daha önce kod oluşturmuşsa 409 döner (ek kodlar yalnızca admin ile eklenebilir)
* - Kod formatı: A-Z0-9, 4-16 karakter arası, DB'de benzersiz
*/
router.post('/codes/me', authenticateToken, asyncHandler(async (req, res) => {
const userId = (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null;
if (!userId) {
  const err = new Error('Kimlik doğrulama gerekli');
  err.status = 401;
  throw err;
}

// Kullanıcının influencer kaydını getir
const influencer = await knex('influencers').where('id', userId).first();
if (!influencer) {
  const err = new Error('Influencer kaydı bulunamadı');
  err.status = 404;
  throw err;
}
if (influencer.status !== 'approved') {
  const err = new Error('Başvurunuz onaylı değil');
  err.status = 403;
  throw err;
}

// Mevcut kod var mı?
const existingCount = await knex('discount_codes').where('influencer_id', influencer.id).count({ c: '*' }).first();
const countVal = Number(existingCount?.c || existingCount?.count || 0);
if (countVal >= 1) {
  const err = new Error('Zaten bir indirim kodunuz var');
  err.status = 409;
  throw err;
}

// İstek gövdesinden opsiyonel kod/parametreleri al
let { code, discount_pct = 10, commission_pct = 10 } = req.body || {};
// Kod yoksa otomatik üret
if (!code || typeof code !== 'string') {
  code = generateCode(influencer.name || influencer.email || 'CODE');
}
code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
if (code.length < 4 || code.length > 16) {
  const err = new Error('Kod 4-16 karakter arasında A-Z veya 0-9 olmalıdır');
  err.status = 400;
  throw err;
}

// Benzersizlik kontrolü
const exists = await knex('discount_codes').where('code', code).first();
if (exists) {
  const err = new Error('Kod zaten kullanılıyor');
  err.status = 409;
  throw err;
}

const [id] = await knex('discount_codes').insert({
  influencer_id: influencer.id,
  code,
  discount_pct: Number(discount_pct) || 10,
  commission_pct: Number(commission_pct) || 10,
  is_active: false
});

const newCode = await knex('discount_codes').where('id', id).first();

res.status(201).json({
  message: 'İndirim kodunuz oluşturuldu',
  code_id: id,
  code: newCode
});
}));

// Basit kod üretici
function generateCode(seed) {
const base = String(seed).toUpperCase().replace(/[^A-Z0-9]/g, '');
const prefix = (base.slice(0, 6) || 'INFLU');
const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
return (prefix + rand).slice(0, 12);
}

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