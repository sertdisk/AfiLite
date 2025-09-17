/**
 * Muhasebe/bakiye ve ödeme/mahsuplaşma ilgili uçlar
 * - Influencer kendine ait özet bakiye ve işlemleri görür.
 * - Yanıt şemaları Ui/lib/api.ts ile uyumludur.
 */
const router = require('express').Router()
const knex = require('../db/sqlite')
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// Yardımcı: user_id çöz
function resolveUserId(req) {
  return (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null
}

// GET /balance — toplam bakiye
router.get('/', authenticateToken, asyncHandler(async(req, res) => {
  const userId = resolveUserId(req)
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli')
    err.status = 401
    throw err
  }

  // Toplam komisyonu hesapla
  const commissionResult = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', userId)
    .sum('sales.commission as total_commission')
    .first()
  const totalCommission = parseFloat(commissionResult.total_commission) || 0

  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .where('influencer_id', userId)
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .sum('amount as total_payouts')
    .first()
  const totalPayouts = parseFloat(payoutResult.total_payouts) || 0

  console.log(`Balance for user ${userId}: totalCommission=${totalCommission}, totalPayouts=${totalPayouts}`);

  // Bakiye hesapla
  const total_balance = totalCommission - totalPayouts

  res.json({ total_balance, currency: 'TRY' })
}))

// GET /sales/me?code=XXX — satış işlemleri (kod-bazlı filtre opsiyonel)
// Dönen şema: { items: [{ id, date, code, customer, package_name, package_amount, commission_amount }], total_commission }
router.get('/sales/me', authenticateToken, asyncHandler(async(req, res) => {
  const userId = resolveUserId(req)
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli')
    err.status = 401
    throw err
  }

  // Doğrudan influencer_id'yi kullan

  const { code } = req.query

  // Uygulamada burada sales tablosundan influencer'a ait ve admin tarafından onaylanmış (mahsuplaşma sonrası) satışlar çekilmelidir.
  let salesQuery = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', userId)
    .select(
      'sales.id',
      'sales.recorded_at as date',
      'sales.code',
      'sales.customer_url as customer',
      'sales.product as package_name',
      'sales.total_amount as package_amount',
      'sales.commission as commission_amount'
    )
    .orderBy('sales.recorded_at', 'desc')

  if (code) {
    salesQuery = salesQuery.where('sales.code', code);
  }

  const items = await salesQuery;

  const totalCommissionResult = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', userId)
    .sum('sales.commission as total_commission')
    .first();
  const total_commission = parseFloat(totalCommissionResult.total_commission) || 0;

  res.json({ items, total_commission })
}))

// GET /history — ödeme/mahsuplaşma geçmişi
// Dönen şema: { items: [{ id, date, method, account, amount, note }] }
router.get('/history', authenticateToken, asyncHandler(async(req, res) => {
  const userId = resolveUserId(req)
  if (!userId) {
    const err = new Error('Kimlik doğrulama gerekli')
    err.status = 401
    throw err
  }

  // Doğrudan influencer_id'yi kullan

  // Uygulamada burada influencer'a ait settlements (ödemeler/mahsuplaşmalar) listelenmelidir.
  const items = await knex('payouts')
    .where({ influencer_id: userId, status: 'completed' })
    .orderBy('created_at', 'desc')
    .select(
      'id',
      'amount',
      'created_at as date',
      'note',
      'status',
      'method',
      'account',
      'bank_name',
      'account_holder_name as account_owner',
      'balance_before as balance_before_settlement',
      'balance_after as balance_after_settlement'
    )

  res.json({ items })
}))

/**
 * ADMIN uçları
 * Not: Gerçek bakiye/hesap kesim hesaplaması satışlar, iade, ödeme ve mahsuplaşma tablolarına göre yapılmalıdır.
 * Bu aşamada örnek/placeholder mantığı kuruyoruz.
 */
// GET /admin-summary/summary (ADMIN)
router.get('/admin-summary/summary', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  // Genel bakiye özeti döndürülecek, influencerId'ye gerek yok
  // Gerçek hesaplama: toplam komisyon - toplam ödemeler

  // Toplam komisyonu hesapla
  const commissionResult = await knex('sales')
    .sum('commission as total_commission')
    .first()
  const totalCommission = parseFloat(commissionResult?.total_commission) || 0

  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .sum('amount as total_payouts')
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .first()
  const totalPayouts = parseFloat(payoutResult?.total_payouts) || 0

  // Bakiye hesapla
  const balance = totalCommission - totalPayouts

  // Son ödeme tarihini al
  const lastPayout = await knex('payouts')
    .where('status', 'completed')
    .orderBy('created_at', 'desc')
    .first()
  const last_settlement_at = lastPayout ? lastPayout.created_at : null

  // Aktif ve onay bekleyen kod sayıları
  const activeCodesCount = await knex('discount_codes')
    .where('is_active', true)
    .count('id as count')
    .first()
    .then(row => parseInt(row?.count) || 0)

  const pendingCodesCount = await knex('discount_codes')
    .where('is_active', false)
    .count('id as count')
    .first()
    .then(row => parseInt(row?.count) || 0)

  // Aktif influencer sayısı
  const activeInfluencersCount = await knex('influencers')
    .where('status', 'approved')
    .count('id as count')
    .first()
    .then(row => parseInt(row?.count) || 0)

  // Toplam satış tutarı
  const totalSalesAmountResult = await knex('sales')
    .sum('total_amount as total_sales_amount')
    .first()
  const totalSalesAmount = parseFloat(totalSalesAmountResult?.total_sales_amount) || 0

  let commissionSinceLastPayout = 0
  let salesAmountSinceLastPayout = 0

  if (last_settlement_at) {
    // Eğer ödeme yapılmışsa, son ödemeden sonraki satışlar ödeme yapılmamış olarak kabul edilir
    const commissionSinceResult = await knex('sales')
      .where('recorded_at', '>', last_settlement_at)
      .sum('commission as commission_since')
      .first()
    commissionSinceLastPayout = parseFloat(commissionSinceResult?.commission_since) || 0

    const salesAmountSinceResult = await knex('sales')
      .where('recorded_at', '>', last_settlement_at)
      .sum('total_amount as sales_amount_since')
      .first()
    salesAmountSinceLastPayout = parseFloat(salesAmountSinceResult?.sales_amount_since) || 0
  } else {
    // Eğer hiç ödeme yapılmamışsa, tüm komisyon ve satış tutarları ödenmemiş olarak kabul edilir
    commissionSinceLastPayout = totalCommission
    salesAmountSinceLastPayout = totalSalesAmount
  }

  // Toplam satış sayısı
  const totalSalesCountResult = await knex('sales')
    .count('id as total_sales_count')
    .first()
  const totalSalesCount = parseInt(totalSalesCountResult?.total_sales_count) || 0

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

  })
}))

// GET /balance/:influencerId/summary (ADMIN)
router.get('/influencer/:influencerId/summary', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  const { influencerId } = req.params

  // Influencer'ı kontrol et
  const influencer = await knex('influencers')
    .where('id', influencerId)
    .first()

  if (!influencer) {
    const err = new Error('Influencer bulunamadı')
    err.status = 404
    throw err
  }

  // Toplam komisyonu hesapla
  const commissionResult = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', influencerId)
    .sum('sales.commission as total_commission')
    .first()
  const totalCommission = parseFloat(commissionResult.total_commission) || 0

  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .where('influencer_id', influencerId)
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .sum('amount as total_payouts')
    .first()
  const totalPayouts = parseFloat(payoutResult.total_payouts) || 0

  // Bakiye hesapla
  const balance = totalCommission - totalPayouts

  // Son ödeme tarihini al
  const lastPayout = await knex('payouts')
    .where('influencer_id', influencerId)
    .where('status', 'completed')
    .orderBy('created_at', 'desc')
    .first()
  const last_settlement_at = lastPayout ? lastPayout.created_at : null

  res.json({
    balance,
    last_settlement_at,
    total_commission: totalCommission,
    total_payouts: totalPayouts
  })
}))

module.exports = router