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
  const totalCommission = (commissionResult && commissionResult.total_commission !== null && commissionResult.total_commission !== undefined)
    ? Number(commissionResult.total_commission) || 0
    : 0;

  // Toplam ödemeleri hesapla
  const payoutResult = await knex('payouts')
    .sum('amount as total_payouts')
    .where('status', 'completed') // Sadece tamamlanmış ödemeleri hesaba kat
    .first()
  const totalPayouts = (payoutResult && payoutResult.total_payouts !== null && payoutResult.total_payouts !== undefined)
    ? Number(payoutResult.total_payouts) || 0
    : 0;

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
  const totalSalesAmount = (totalSalesAmountResult && totalSalesAmountResult.total_sales_amount !== null && totalSalesAmountResult.total_sales_amount !== undefined)
    ? Number(totalSalesAmountResult.total_sales_amount) || 0
    : 0;

  // Ödemesi yapılmamış komisyon (toplam komisyon - ödenmiş komisyon)
  const unpaidCommission = totalCommission - totalPayouts;

  console.log('[DEBUG] Admin balance summary - raw values:', {
    totalSalesAmount: totalSalesAmountResult?.total_sales_amount,
    totalCommission: commissionResult?.total_commission,
    totalPayouts: payoutResult?.total_payouts
 });
  console.log('[DEBUG] Admin balance summary - processed values:', {
    totalSalesAmount,
    totalCommission,
    totalPayouts,
    unpaidCommission
  });

  // Ödemesi yapılmış komisyonun karşılık geldiği satış tutarı (yaklaşık hesaplama)
  let paidSalesAmount = 0;
  if (totalCommission > 0 && totalSalesAmount > 0 && !isNaN(totalCommission) && !isNaN(totalSalesAmount)) {
    const commissionRate = totalSalesAmount / totalCommission;
    paidSalesAmount = totalPayouts * commissionRate;
    console.log('[DEBUG] Admin balance summary - commission rate calculation:', {
      commissionRate,
      totalPayouts,
      paidSalesAmount
    });
    // Sayısal olmayan sonuçları kontrol et
    if (isNaN(paidSalesAmount) || !isFinite(paidSalesAmount)) {
      console.log('[DEBUG] Admin balance summary - paidSalesAmount is NaN or Infinite, setting to 0');
      paidSalesAmount = 0;
    }
  } else {
    console.log('[DEBUG] Admin balance summary - commission rate calculation skipped:', {
      totalCommission,
      totalSalesAmount,
      condition1: totalCommission > 0,
      condition2: totalSalesAmount > 0,
      condition3: !isNaN(totalCommission),
      condition4: !isNaN(totalSalesAmount)
    });
  }

  // Ödemesi yapılmamış komisyonun karşılık geldiği satış tutarı (yaklaşık hesaplama)
  let unpaidSalesAmount = 0;
 if (totalCommission > 0 && totalSalesAmount > 0 && !isNaN(totalCommission) && !isNaN(totalSalesAmount)) {
    const commissionRate = totalSalesAmount / totalCommission;
    unpaidSalesAmount = unpaidCommission * commissionRate;
    // Sayısal olmayan sonuçları kontrol et
    if (isNaN(unpaidSalesAmount) || !isFinite(unpaidSalesAmount)) {
      unpaidSalesAmount = 0;
    }
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
    totalCommissionPaid: totalPayouts,
    paidSalesAmount,
    commissionSinceLastPayout: unpaidCommission,
    salesAmountSinceLastPayout: unpaidSalesAmount,
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

  // Toplam satış sayısını hesapla
  const totalSalesResult = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', influencerId)
    .count('sales.id as total_sales_count')
    .first()
  const totalSales = parseInt(totalSalesResult?.total_sales_count) || 0

  // Bakiye hesapla
  const balance = totalCommission - totalPayouts

  // Son ödeme tarihini al (sadece completed olanlar)
  const lastPayout = await knex('payouts')
    .where('influencer_id', influencerId)
    .where('status', 'completed')
    .orderBy('created_at', 'desc')
    .first()
  const last_settlement_at = lastPayout ? lastPayout.created_at : null

  // Son ödeme girişim tarihi (tüm status'ler dahil)
  const lastPayoutAttempt = await knex('payouts')
    .where('influencer_id', influencerId)
    .orderBy('created_at', 'desc')
    .first()
  const last_attempt_date = lastPayoutAttempt ? lastPayoutAttempt.created_at : null

  res.json({
    balance,
    last_settlement_at,
    total_commission: totalCommission,
    paid_commission: totalPayouts,
    unpaid_commission: totalCommission - totalPayouts,
    total_sales: totalSales
  })
}))

module.exports = router