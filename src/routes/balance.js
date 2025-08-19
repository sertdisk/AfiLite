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
// GET /balance/:influencerId/summary (ADMIN)
router.get('/balance/admin-summary/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  console.log('[Backend] GET /balance/admin-summary/summary endpoint reached.');
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

  res.json({
    balance,
    last_settlement_at
  });
}));

module.exports = router;