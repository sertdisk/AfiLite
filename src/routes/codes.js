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
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
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

/**
 * Admin: Belirli bir influencer'ın kodlarını ID ile listeler.
 * Güvenlik: requireAdmin ile korunmaktadır.
 */
router.get('/influencer/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const influencer = await knex('influencers').where('id', id).first();
  if (!influencer) {
    const err = new Error('Influencer bulunamadı');
    err.status = 404;
    throw err;
  }

  const codes = await knex('discount_codes')
    .where('influencer_id', id)
    .orderBy('created_at', 'desc');

  res.json({ influencer_id: id, codes });
}));

// Tüm indirim kodlarını listele (Admin)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = 'created_at', 
    order = 'desc',
    startDate,
    endDate,
    isActive
  } = req.query;

  const offset = (page - 1) * limit;

  // Base query
  const baseQuery = knex('discount_codes')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id');

  // Filters
  if (isActive === 'true' || isActive === 'false') {
    baseQuery.where('discount_codes.is_active', isActive === 'true');
  }
  if (startDate) {
    baseQuery.where('discount_codes.created_at', '>=', startDate);
  }
  if (endDate) {
    baseQuery.where('discount_codes.created_at', '<=', `${endDate}T23:59:59.999Z`);
  }

  // Count total records with filters
  const totalQuery = baseQuery.clone().count('discount_codes.id as total').first();
  
  // Main data query
  const dataQuery = baseQuery.clone()
    .select(
      'discount_codes.id',
      'discount_codes.code',
      'discount_codes.discount_pct',
      'discount_codes.commission_pct',
      'discount_codes.is_active',
      'discount_codes.created_at',
      'influencers.id as influencer_id',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email',
      'influencers.brand_name'
    );

  // Sorting
  const allowedSortBy = ['created_at', 'influencer_name', 'brand_name'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  let orderByColumn = `discount_codes.${safeSortBy}`;
  if (safeSortBy === 'influencer_name') {
    orderByColumn = 'influencers.full_name';
  } else if (safeSortBy === 'brand_name') {
    orderByColumn = 'influencers.brand_name';
  }
  dataQuery.orderBy(orderByColumn, safeOrder);

  // Pagination
  dataQuery.limit(limit).offset(offset);

  // Execute queries
  const [items, totalResult] = await Promise.all([
    dataQuery,
    totalQuery
  ]);
  
  const total = totalResult.total;

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// Tek bir kod detayını getir (ID ile)
router.get('/:id', asyncHandler(async (req, res) => {
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

// Kod string'i ile detay getir (kod arama)
router.get('/search/:code', asyncHandler(async (req, res) => {
  const codeString = req.params.code?.toString().toUpperCase().trim();
  
  if (!codeString || codeString.length < 2) {
    const err = new Error('Kod en az 2 karakter olmalıdır');
    err.status = 400;
    err.code = 'INVALID_CODE_LENGTH';
    throw err;
  }

  // Sadece alfanümerik karakterlere izin ver
  if (!/^[A-Z0-9]+$/.test(codeString)) {
    const err = new Error('Kod sadece harf ve rakam içerebilir');
    err.status = 400;
    err.code = 'INVALID_CODE_FORMAT';
    throw err;
  }

  const code = await knex('discount_codes')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .leftJoin('influencer_social_accounts', function() {
      this.on('influencers.id', '=', 'influencer_social_accounts.influencer_id')
          .andOn('influencer_social_accounts.is_active', '=', knex.raw('?', [true]))
    })
    .select(
      'discount_codes.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email',
      'influencers.brand_name as influencer_brand_name'
    )
    .where('discount_codes.code', codeString)
    .where('discount_codes.is_active', true)
    .first();
  
  if (!code) {
    const err = new Error('Kod bulunamadı veya aktif değil');
    err.status = 404;
    err.code = 'CODE_NOT_FOUND';
    throw err;
  }
  
  res.json({
    success: true,
    code: {
      id: code.id,
      code: code.code,
      influencer_id: code.influencer_id,
      influencer_name: code.influencer_name,
      influencer_email: code.influencer_email,
      influencer_brand_name: code.influencer_brand_name,
      brand_name: code.influencer_brand_name, // Alias for frontend compatibility
      discount_pct: code.discount_pct,
      commission_pct: code.commission_pct,
      commission_rate: code.commission_pct, // Alias for frontend compatibility
      commission_percentage: code.commission_pct, // Another alias
      is_active: code.is_active,
      created_at: code.created_at
    }
  });
}));

// Yeni indirim kodu oluştur (ADMIN) - Admin bir influencere sınırsız sayıda ek kod ekleyebilir
router.post('/', requireAdmin, validateDiscountCode, asyncHandler(async (req, res) => {
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
router.post('/me', authenticateToken, asyncHandler(async (req, res) => {
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
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
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
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
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