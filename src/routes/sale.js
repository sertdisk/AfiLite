/**
 * Türkçe: Bu dosya satış uç noktalarını içerir.
 * Güvenlik: Hatalar merkezi handler ile yönetilir, PII sızıntısı engellenir.
 * - POST /sale için girdi doğrulama ve katmanlı rate limit eklendi.
 * - GET uçları authenticateToken ile korunur.
 * - PATCH /sales/:id (ADMIN) ile satış kaydındaki düzenlenebilir alanlar güncellenir.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
// JWT koruması yalnızca GET uçları için kullanılacak
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateSale, validateSaleUpdate } = require('../middleware/validation');
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
  const customerUrl = typeof req.body.customer_url === 'string' ? req.body.customer_url.trim() : null;
  const product = typeof req.body.product === 'string' ? req.body.product.trim() : null;
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
    customer_url: customerUrl,
    product: product,
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
  const { code, start_date, end_date, page = 1, limit = 50, influencerId } = req.query; // influencerId eklendi
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.id',
      'sales.code',
      'sales.total_amount',
      'sales.commission',
      'sales.customer_url',
      'sales.product',
      'sales.recorded_at',
      'influencers.full_name as influencer_name',
      'influencers.brand_name as influencer_brand_name',
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

  if (influencerId) { // influencerId filtresi eklendi
    query = query.where('discount_codes.influencer_id', influencerId);
  }
  
  const offset = (page - 1) * limit;
  
  // Önce toplam sayıyı filrelere göre al
  const totalQuery = knex('sales').count('* as count');
  if (code) totalQuery.where('code', code.toUpperCase());
  if (start_date) totalQuery.where('recorded_at', '>=', new Date(start_date));
  if (end_date) totalQuery.where('recorded_at', '<=', new Date(end_date));
  if (influencerId) { // influencerId filtresi eklendi
    totalQuery.join('discount_codes', 'sales.code', 'discount_codes.code')
              .where('discount_codes.influencer_id', influencerId);
  }

  const [{ count }] = await totalQuery;

  // Sonra veriyi sayfalama ile al
  query = query.limit(limit).offset(offset);
  const sales = await query;
  
  res.json({
    items: sales, // `items` olarak değiştirildi, frontend ile uyum için
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

// Satış güncelle (ADMIN)
router.patch('/sales/:id', requireAdmin, validateSaleUpdate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { total_amount, customer_url, product, note } = req.body;

  const sale = await knex('sales').where({ id }).first();
  if (!sale) {
    const err = new Error('Satış bulunamadı');
    err.status = 404;
    throw err;
  }

  const updatePayload = {};
  if (customer_url !== undefined) updatePayload.customer_url = customer_url;
  if (product !== undefined) updatePayload.product = product;
  if (note !== undefined) updatePayload.note = note;

  // Tutar değişirse komisyonu yeniden hesapla
  if (total_amount !== undefined) {
    const parsedAmount = Number(total_amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      const err = new Error('Geçersiz tutar');
      err.status = 400;
      throw err;
    }
    updatePayload.total_amount = parsedAmount;

    const discountCode = await knex('discount_codes').where('code', sale.code).first();
    if (discountCode) {
      updatePayload.commission = (parsedAmount * discountCode.commission_pct) / 100;
    }
  }

  await knex('sales').where({ id }).update(updatePayload);

  const updatedSale = await knex('sales').where({ id }).first();
  res.json(updatedSale);
}));

// Satış istatistikleri endpointi
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

// Export endpointi
router.get('/sales/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { format = 'csv', code, start_date, end_date, influencerId } = req.query;
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.id',
      'sales.code',
      'sales.total_amount',
      'sales.commission',
      'sales.customer_url',
      'sales.product',
      'sales.recorded_at',
      'influencers.full_name as influencer_name',
      'influencers.brand_name as influencer_brand_name',
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
  
  if (influencerId) {
    query = query.where('discount_codes.influencer_id', influencerId);
  }
  
  const sales = await query;
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
    
    const headers = ['ID', 'Code', 'Total Amount', 'Commission', 'Customer URL', 'Product', 'Recorded At', 'Influencer Name', 'Influencer Email', 'Discount %', 'Commission %'];
    res.write(headers.join(',') + '\n');
    
    for (const sale of sales) {
      const row = [
        sale.id,
        `"${sale.code}"`, 
        sale.total_amount,
        sale.commission,
        `"${sale.customer_url || ''}"`, 
        `"${sale.product || ''}"`, 
        `"${sale.recorded_at}"`, 
        `"${sale.influencer_name || ''}"`, 
        `"${sale.influencer_email || ''}"`, 
        sale.discount_pct,
        sale.commission_pct
      ];
      res.write(row.join(',') + '\n');
    }
    
    res.end();
  } else if (format === 'xlsx') {
    // Excel export için exceljs kütüphanesini kullan
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales');
    
    // Başlıklar
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Commission', key: 'commission', width: 15 },
      { header: 'Customer URL', key: 'customer_url', width: 20 },
      { header: 'Product', key: 'product', width: 20 },
      { header: 'Recorded At', key: 'recorded_at', width: 20 },
      { header: 'Influencer Name', key: 'influencer_name', width: 25 },
      { header: 'Influencer Email', key: 'influencer_email', width: 30 },
      { header: 'Discount %', key: 'discount_pct', width: 12 },
      { header: 'Commission %', key: 'commission_pct', width: 15 }
    ];
    
    // Verileri ekle
    worksheet.addRows(sales);
    
    // Excel dosyasını oluştur ve gönder
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } else {
    res.json({ sales });
  }
}));

module.exports = router;
