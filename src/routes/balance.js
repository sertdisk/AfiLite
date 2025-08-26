/**
 * Muhasebe/bakiye ve ödeme/mahsuplaşma ilgili uçlar
 * - Influencer kendine ait özet bakiye ve işlemleri görür.
 * - Yanıt şemaları Ui/lib/api.ts ile uyumludur.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Yardımcı: user_id çöz
function resolveUserId(req) {
  return (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null;
}

// GET /balance/me — toplam bakiye
router.get('/balance/me', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli');
    err.status = 401;
    throw err;
  }

  // Doğrudan influencer_id'yi kullan

  // Basit bakiye hesaplama:
  // Varsayım: commissions tablosu (veya sales tablosu) üzerinden toplam kazanılan komisyon - settlements toplamı
  // Bu örnekte, gerekli tabloların varlığı belirsiz olduğundan 0 döndürülüyor.
  // İleride gerçek şemaya göre UPDATE edilir.
  const total_balance = 0;
  res.json({ total_balance, currency: 'TRY' });
}));

// GET /sales/me?code=XXX — satış işlemleri (kod-bazlı filtre opsiyonel)
// Dönen şema: { items: [{ id, date, code, customer, package_name, package_amount, commission_amount }], total_commission }
router.get('/sales/me', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli');
    err.status = 401;
    throw err;
  }

  // Doğrudan influencer_id'yi kullan

  const { code } = req.query;

  // Gerçek veri modeli netleşene kadar sahte/boş yanıt üretelim.
  // Uygulamada burada sales tablosundan influencer'a ait ve admin tarafından onaylanmış (mahsuplaşma sonrası) satışlar çekilmelidir.
  const items = []; // örn: await knex('sales').where({ influencer_id: infl.id, ...(code && { code }) }).orderBy('date','desc')
  const total_commission = 0; // örn: SUM(commission_amount)

  res.json({ items, total_commission });
}));

// GET /balance/me/settlements — ödeme/mahsuplaşma geçmişi
// Dönen şema: { items: [{ id, date, method, account, amount, note }] }
router.get('/balance/me/settlements', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli');
    err.status = 401;
    throw err;
  }

  // Doğrudan influencer_id'yi kullan

  // Gerçek veri modeli netleşene kadar sahte/boş yanıt üretelim.
  // Uygulamada burada influencer'a ait settlements (ödemeler/mahsuplaşmalar) listelenmelidir.
  const items = []; // örn: await knex('settlements').where({ influencer_id: infl.id }).orderBy('date','desc')

  res.json({ items });
}));

/**
 * ADMIN uçları
 * Not: Gerçek bakiye/hesap kesim hesaplaması satışlar, iade, ödeme ve mahsuplaşma tablolarına göre yapılmalıdır.
 * Bu aşamada örnek/placeholder mantığı kuruyoruz.
 */
// GET /admin-summary/summary (ADMIN)
router.get('/admin-summary/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  console.log('[Backend] GET /api/balance/admin-summary/summary endpoint reached.');
  // Genel bakiye özeti döndürülecek, influencerId'ye gerek yok
  // Gerçek hesaplama: toplam komisyon - toplam ödemeler
  
  // Toplam komisyonu hesapla
  const commissionResult = await knex('sales')
    .sum('commission as total_commission')
    .first();
  const totalCommission = parseFloat(commissionResult.total_commission) || 0;
  console.log(`[Backend] Total Commission: ${totalCommission}`);
  
  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .sum('amount as total_payouts')
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .first();
  const totalPayouts = parseFloat(payoutResult.total_payouts) || 0;
  console.log(`[Backend] Total Payouts (completed): ${totalPayouts}`);
  
  // Bakiye hesapla
  const balance = totalCommission - totalPayouts;
  console.log(`[Backend] Calculated Balance: ${balance}`);
  
  // Son ödeme tarihini al
  const lastPayout = await knex('payouts')
    .where('status', 'completed')
    .orderBy('created_at', 'desc')
    .first();
  const last_settlement_at = lastPayout ? lastPayout.created_at : null;
  console.log(`[Backend] Last Settlement At: ${last_settlement_at}`);

  // Aktif ve onay bekleyen kod sayıları
  const activeCodesCount = await knex('discount_codes')
    .where('is_active', true)
    .count('id as count')
    .first()
    .then(row => parseInt(row.count) || 0);

  const pendingCodesCount = await knex('discount_codes')
    .where('is_active', false)
    .count('id as count')
    .first()
    .then(row => parseInt(row.count) || 0);

  // Aktif influencer sayısı
  const activeInfluencersCount = await knex('influencers')
    .where('status', 'approved')
    .count('id as count')
    .first()
    .then(row => parseInt(row.count) || 0);

  // Toplam satış tutarı
  const totalSalesAmountResult = await knex('sales')
    .sum('total_amount as total_sales_amount')
    .first();
  const totalSalesAmount = parseFloat(totalSalesAmountResult.total_sales_amount) || 0;

  // Ödenmemiş komisyonlar
  const unpaidCommission = totalCommission - totalPayouts;

  // Ödenmemiş komisyonlara karşılık gelen satış tutarı
  let unpaidSalesAmount = 0;
  if (totalCommission > 0) {
    const unpaidCommissionRatio = unpaidCommission / totalCommission;
    unpaidSalesAmount = totalSalesAmount * unpaidCommissionRatio;
  }

  // Ödenmiş komisyonlara karşılık gelen satış tutarı
  const paidSalesAmount = totalSalesAmount - unpaidSalesAmount;

  // Eğer hiç ödeme yapılmamışsa, tüm satışlar ödeme yapılmamış olarak kabul edilir
  let commissionSinceLastPayout = unpaidCommission;
  let salesAmountSinceLastPayout = unpaidSalesAmount;
  
  if (last_settlement_at) {
    // Eğer ödeme yapılmışsa, son ödemeden sonraki satışlar ödeme yapılmamış olarak kabul edilir
    const commissionSinceResult = await knex('sales')
      .where('recorded_at', '>', last_settlement_at)
      .sum('commission as commission_since')
      .first();
    commissionSinceLastPayout = parseFloat(commissionSinceResult.commission_since) || 0;

    const salesAmountSinceResult = await knex('sales')
      .where('recorded_at', '>', last_settlement_at)
      .sum('total_amount as sales_amount_since')
      .first();
    salesAmountSinceLastPayout = parseFloat(salesAmountSinceResult.sales_amount_since) || 0;
  }

  // Toplam satış sayısı
  const totalSalesCountResult = await knex('sales')
    .count('id as total_sales_count')
    .first();
  const totalSalesCount = parseInt(totalSalesCountResult.total_sales_count) || 0;

  res.json({
    balance,
    last_settlement_at,
    activeCodesCount,
    pendingCodesCount,
    activeInfluencersCount,
    totalCommission,
    totalSalesAmount,
    commissionSinceLastPayout,
    salesAmountSinceLastPayout,
    totalPayouts,
    totalSalesCount,
    paidSalesAmount
  });
}));

// GET /balance/:influencerId/summary (ADMIN)
router.get('/balance/:influencerId/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { influencerId } = req.params;
  
  // Influencer'ı kontrol et
  const influencer = await knex('influencers')
    .where('id', influencerId)
    .first();
  
  if (!influencer) {
    const err = new Error('Influencer bulunamadı');
    err.status = 404;
    throw err;
  }
  
  // Toplam komisyonu hesapla
  const commissionResult = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', influencerId)
    .sum('sales.commission as total_commission')
    .first();
  const totalCommission = parseFloat(commissionResult.total_commission) || 0;
  
  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .where('influencer_id', influencerId)
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .sum('amount as total_payouts')
    .first();
  const totalPayouts = parseFloat(payoutResult.total_payouts) || 0;
  
  // Bakiye hesapla
  const balance = totalCommission - totalPayouts;
  
  // Son ödeme tarihini al
  const lastPayout = await knex('payouts')
    .where('influencer_id', influencerId)
    .where('status', 'completed')
    .orderBy('created_at', 'desc')
    .first();
  const last_settlement_at = lastPayout ? lastPayout.created_at : null;
  
  res.json({
    balance,
    last_settlement_at,
    total_commission: totalCommission,
    total_payouts: totalPayouts
  });
}));

module.exports = router;