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
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy('payouts.created_at', 'desc');
  
  if (status) {
    query = query.where('payouts.status', status);
  }
  
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
    payouts,
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
  const { influencerId, amount, iban, note, status = 'pending' } = req.body;
  
  if (!influencerId || !amount || !iban) {
    const err = new Error('Influencer ID, amount ve IBAN zorunludur');
    err.status = 400;
    throw err;
  }
  
  // Influencer kontrolü
  const influencer = await knex('influencers').where('id', influencerId).first();
  if (!influencer) {
    const err = new Error('Influencer bulunamadı');
    err.status = 404;
    throw err;
  }
  
  // Ödeme oluştur
  const [id] = await knex('payouts').insert({
    influencer_id: influencerId,
    amount: Number(amount),
    iban: String(iban).trim(),
    note: note || null,
    status: String(status).trim()
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

// GET /payouts/:id - Tek bir ödeme detayı
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
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
    const err = new Error('Ödeme bulunamadı');
    err.status = 404;
    throw err;
  }
  
  // Admin değilse sadece kendi ödemelerini görebilir
  if (req.user.role !== 'admin' && payout.influencer_id !== (req.user.userId || req.user.user_id || req.user.id)) {
    const err = new Error('Bu ödemeye erişim yetkiniz yok');
    err.status = 403;
    throw err;
  }
  
  res.json(payout);
}));

// PATCH /payouts/:id - Ödeme güncelle (Admin)
router.patch('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    const err = new Error('Status alanı zorunludur');
    err.status = 400;
    throw err;
  }
  
  const payout = await knex('payouts').where('id', req.params.id).first();
  if (!payout) {
    const err = new Error('Ödeme bulunamadı');
    err.status = 404;
    throw err;
  }
  
  await knex('payouts')
    .where('id', req.params.id)
    .update({
      status: String(status).trim(),
      updated_at: knex.fn.now()
    });
  
  const updatedPayout = await knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .where('payouts.id', req.params.id)
    .first();
  
  res.json(updatedPayout);
}));

// GET /payouts/export - Ödemeleri export et (Admin)
router.get('/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
  
  if (status) {
    query = query.where('payouts.status', status);
  }
  
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