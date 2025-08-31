/**
 * Ödeme (payout) yönetimi uçları
 * - Admin ödemeleri yönetebilir
 * - Influencer ödeme geçmişini görebilir
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /payouts - Ödemeleri listele (Admin)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { status, influencerId, from, to, page = 1, limit = 50 } = req.query;
  
  let query = knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.id',
      'payouts.influencer_id',
      'payouts.amount',
      'payouts.iban',
      'payouts.status',
      'payouts.note',
      'payouts.created_at',
      'payouts.updated_at',
      'payouts.balance_before', // Eklendi
      'payouts.balance_after', // Eklendi
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy('payouts.created_at', 'desc');
  

  
  if (influencerId) {
    query = query.where('payouts.influencer_id', influencerId);
  }
  
  if (from) {
    query = query.where('payouts.created_at', '>=', new Date(from));
  }
  
  if (to) {
    query = query.where('payouts.created_at', '<=', new Date(to));
  }
  
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset);
  
  const payouts = await query;
  
  const totalQuery = knex('payouts').count('* as count');
  if (status) totalQuery.where('status', status);
  if (influencerId) totalQuery.where('influencer_id', influencerId);
  if (from) totalQuery.where('created_at', '>=', new Date(from));
  if (to) totalQuery.where('created_at', '<=', new Date(to));
  
  const [{ count }] = await totalQuery;
  
  res.json({
    items: payouts, // Frontend ile uyum için `items` kullanılıyor
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
}));

// POST /payouts - Yeni ödeme oluştur (Admin)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { influencerId, amount, iban, note, status = 'completed' } = req.body; // Değiştirildi
  
  if (!influencerId || !amount || !iban) {
    const err = new Error('Influencer ID, amount ve IBAN zorunludur');
    err.status = 400;
    throw err;
  }
  
  const influencer = await knex('influencers').where('id', influencerId).first();
  if (!influencer) {
    const err = new Error('Influencer bulunamadı');
    err.status = 404;
    throw err;
  }

  // Bakiye hesaplaması
  const { total_commission } = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', influencerId)
    .sum('sales.commission as total_commission')
    .first();

  const { total_payouts } = await knex('payouts')
    .where({ influencer_id: influencerId, status: 'completed' })
    .sum('amount as total_payouts')
    .first();

  const balance_before = (total_commission || 0) - (total_payouts || 0);
  const balance_after = balance_before - Number(amount);

  // Ödeme oluştur
  const [id] = await knex('payouts').insert({
    influencer_id: influencerId,
    amount: Number(amount),
    iban: String(iban).trim(),
    note: note || null,
    status: String(status).trim(),
    balance_before,
    balance_after
  });
  
  const payout = await knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .where('payouts.id', id)
    .first();
  
  res.status(201).json({
    message: 'Ödeme oluşturuldu',
    payout_id: id,
    payout
  });
}));

// GET /api/payouts/:id - Tek bir ödeme detayı
router.get('/api/payouts/:id', authenticateToken, asyncHandler(async (req, res) => {
  const payout = await knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .where('payouts.id', req.params.id)
    .first();
  
  if (!payout) {
    // Eğer ödeme bulunamazsa boş bir dizi döndür
    return res.json({});
  }
  
  // Admin değilse sadece kendi ödemelerini görebilir
  if (req.user.role !== 'admin' && payout.influencer_id !== (req.user.userId || req.user.user_id || req.user.id)) {
    const err = new Error('Bu ödemeye erişim yetkiniz yok');
    err.status = 403;
    throw err;
  }
  
  res.json(payout);
}));



// GET /api/payouts/export - Ödemeleri export et (Admin)
router.get('/api/payouts/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { format = 'csv', status, influencerId, from, to } = req.query;
  
  let query = knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.id',
      'payouts.influencer_id',
      'payouts.amount',
      'payouts.iban',
      'payouts.status',
      'payouts.note',
      'payouts.created_at',
      'payouts.updated_at',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy('payouts.created_at', 'desc');
  

  
  if (influencerId) {
    query = query.where('payouts.influencer_id', influencerId);
  }
  
  if (from) {
    query = query.where('payouts.created_at', '>=', new Date(from));
  }
  
  if (to) {
    query = query.where('payouts.created_at', '<=', new Date(to));
  }
  
  const payouts = await query;
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
    
    const headers = ['ID', 'Influencer ID', 'Influencer Name', 'Email', 'Amount', 'IBAN', 'Status', 'Note', 'Created At'];
    res.write(headers.join(',') + '\n');
    
    for (const payout of payouts) {
      const row = [
        payout.id,
        payout.influencer_id,
        `"${payout.influencer_name}"`,
        `"${payout.influencer_email}"`,
        payout.amount,
        `"${payout.iban}"`,
        payout.status,
        `"${payout.note || ''}"`,
        payout.created_at
      ];
      res.write(row.join(',') + '\n');
    }
    
    res.end();
  } else {
    res.json({ payouts });
  }
}));

module.exports = router;