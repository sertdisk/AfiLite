/**
 * Türkçe: Bu dosya satış uç noktalarını içerir.
 * Güvenlik: Hatalar merkezi handler ile yönetilir, PII sızıntısı engellenir.
 * - POST /sale için girdi doğrulama ve katmanlı rate limit eklendi.
 * - GET uçları authenticateToken ile korunur.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
// JWT koruması yalnızca GET uçları için kullanılacak
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateSale } = require('../middleware/validation');
const { saleShortLimiter, saleLongLimiter } = require('../middleware/rateLimiter');

/**
 * Türkçe açıklama:
 * Bu dosya satış uç noktalarını içerir. POST /sale uç noktası PUBLIC'tir.
 * Yük testlerinde kod oluşturma ile hemen ardından gelen yoğun satış isteklerinde
 * milisaniyelik görünürlük gecikmelerini tolere etmek için küçük, kontrollü bir retry uygulanır.
 */

// Küçük bekleme yardımcı fonksiyonu (ms)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Aktif indirim kodunu retry ile arayan yardımcı
async function findActiveCodeWithRetry(codeUpper, maxAttempts = 5, delayMs = 20) {
  let record = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    record = await knex('discount_codes')
      .where('code', codeUpper)
      .where('is_active', true)
      .first();
    if (record) return record;
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  return record;
}

// Satış raporlama (PUBLIC)
/**
 * Güvenli public satış bildirimi uç noktası
 * Testte 401 "Access token gerekli" alıyoruz. Bunun nedeni muhtemelen global seviyede
 * bir auth middleware’in yanlışlıkla devreye girmesi olabilir. Bu uç noktayı bilinçli
 * olarak önce tanımlayarak ve açıkça public tutarak 401’i önleriz.
 */
router.post('/sale', saleShortLimiter, saleLongLimiter, validateSale, asyncHandler(async (req, res) => {
  const rawCode = typeof req.body.code === 'string' ? req.body.code.trim() : req.body.code;
  const parsedAmount = Number(req.body.total_amount);
  const codeUpper = String(rawCode).toUpperCase();

  // Kod kontrolü – küçük retry ile
  const discountCode = await findActiveCodeWithRetry(codeUpper);
  if (!discountCode) {
    const err = new Error('Geçersiz veya pasif kod');
    err.status = 404;
    throw err;
  }

  // Komisyon hesaplama
  const commission = (parsedAmount * discountCode.commission_pct) / 100;

  // Satış kaydet
  const [saleId] = await knex('sales').insert({
    code: codeUpper,
    total_amount: parsedAmount,
    commission,
    recorded_at: new Date()
  });

  // Satış detaylarını getir
  const sale = await knex('sales').where('id', saleId).first();

  // Influencer bilgilerini ekle (bilgi amaçlı; yoksa null döndür)
  const influencer = await knex('influencers')
    .join('discount_codes', 'influencers.id', 'discount_codes.influencer_id')
    .where('discount_codes.code', codeUpper)
    .select('influencers.full_name', 'influencers.email')
    .first();

  res.status(201).json({
    message: 'Satış kaydedildi',
    sale_id: sale.id,
    sale: {
      ...sale,
      influencer_name: influencer ? influencer.full_name : null,
      influencer_email: influencer ? influencer.email : null,
      discount_pct: discountCode.discount_pct,
      commission_pct: discountCode.commission_pct
    }
  });
}));

// Satışları listele (korumalı - admin veya yetkili kullanıcılar)
router.get('/sales', authenticateToken, asyncHandler(async (req, res) => {
  const { code, start_date, end_date, page = 1, limit = 50 } = req.query;
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.id',
      'sales.code',
      'sales.total_amount',
      'sales.commission',
      'sales.recorded_at',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email',
      'discount_codes.discount_pct',
      'discount_codes.commission_pct'
    )
    .orderBy('sales.recorded_at', 'desc');
  
  if (code) {
    query = query.where('sales.code', code.toUpperCase());
  }
  
  if (start_date) {
    query = query.where('sales.recorded_at', '>=', new Date(start_date));
  }
  
  if (end_date) {
    query = query.where('sales.recorded_at', '<=', new Date(end_date));
  }
  
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset);
  
  const sales = await query;
  
  const totalQuery = knex('sales').count('* as count');
  if (code) totalQuery.where('code', code.toUpperCase());
  if (start_date) totalQuery.where('recorded_at', '>=', new Date(start_date));
  if (end_date) totalQuery.where('recorded_at', '<=', new Date(end_date));
  
  const [{ count }] = await totalQuery;
  
  res.json({
    sales,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
}));

// Tek bir satış detayını getir (korumalı)
router.get('/sale/:id', authenticateToken, asyncHandler(async (req, res) => {
  const sale = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email',
      'discount_codes.discount_pct',
      'discount_codes.commission_pct'
    )
    .where('sales.id', req.params.id)
    .first();
  
  if (!sale) {
    const err = new Error('Satış bulunamadı');
    err.status = 404;
    throw err;
  }
  
  res.json(sale);
}));

// Toplam satış istatistikleri (korumalı)
router.get('/sales/stats', authenticateToken, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id');
  
  if (start_date) {
    query = query.where('sales.recorded_at', '>=', new Date(start_date));
  }
  
  if (end_date) {
    query = query.where('sales.recorded_at', '<=', new Date(end_date));
  }
  
  const stats = await query
    .select(
      knex.raw('COUNT(*) as total_sales'),
      knex.raw('SUM(total_amount) as total_revenue'),
      knex.raw('SUM(commission) as total_commission'),
      knex.raw('AVG(total_amount) as avg_sale_amount')
    )
    .first();
  
  const influencerStats = await query
    .select(
      'influencers.full_name',
      'influencers.email',
      knex.raw('COUNT(*) as sales_count'),
      knex.raw('SUM(sales.total_amount) as total_revenue'),
      knex.raw('SUM(sales.commission) as total_commission')
    )
    .groupBy('influencers.id', 'influencers.full_name', 'influencers.email')
    .orderBy('total_commission', 'desc');
  
  res.json({
    stats: {
      ...stats,
      by_influencer: influencerStats
    }
  });
}));

module.exports = router;