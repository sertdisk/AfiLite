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
router.get('/balance/:influencerId/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const influencerId = Number(req.params.influencerId);
  if (!influencerId || Number.isNaN(influencerId)) {
    const err = new Error('Geçerli influencerId zorunludur');
    err.status = 400;
    throw err;
  }

  // Influencer var mı kontrolü
  const infl = await knex('influencers').where('id', influencerId).first();
  if (!infl) {
    const err = new Error('Influencer bulunamadı');
    err.status = 404;
    throw err;
  }

  // Örnek/placeholder: gerçek hesaplama ileride eklenecek
  const balance = 0; // örn: SUM(commission_amount) - SUM(settlements)
  const last_settlement_at = null; // örn: settlements.max(date)

  res.json({
    influencer_id: influencerId,
    balance,
    last_settlement_at
  });
}));

module.exports = router;