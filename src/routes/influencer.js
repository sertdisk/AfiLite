const express = require('express');
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { toSqliteDatetime } = require('../util/date');


// Admin için arama ucu: GET /influencers/search?q=
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  
  if (q.length < 2 && q.length > 0) {
    return res.json({ items: [] });
  }

  const like = `%${q}%`;

  // Önce influencer kodu ile eşleşen influencer'ları bul
  const codeMatches = await knex('discount_codes')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select('influencers.id')
    .where('discount_codes.code', 'like', like)
    .andWhere('influencers.role', 'influencer')
    .groupBy('influencers.id');

  const codeMatchIds = codeMatches.map(item => item.id);

  // Diğer alanlarla eşleşenleri bul ve kod eşleşmeleriyle birleştir
  const query = knex('influencers')
    .select('id', 'full_name as name', 'email', 'status', 'brand_name')
    .where(function() {
      this.where('full_name', 'like', like)
        .orWhere('email', 'like', like)
        .orWhere('brand_name', 'like', like)
        .orWhereIn('id', codeMatchIds);
    })
    .andWhere('role', 'influencer')
    .limit(20);

  const results = await query;

  return res.json({ items: results });
}));

// GET /api/influencer/me - Influencer'ın kendi bilgilerini getirir
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const influencer = await knex('influencers')
    .select(
      'id',
      'full_name as name',
      'email',
      'phone',
      'brand_name as brandName',
      'status',
      'created_at',
      'updated_at',
      'bio',
      'website',
      'notes as platformMessage'
    )
    .where({ id: influencerId, role: 'influencer' })
    .first();

  if (!influencer) {
    return res.status(404).json({ error: 'Influencer bulunamadı.' });
  }

  res.json(influencer);
}));

// PATCH /api/influencer/me - Influencer'ın kendi bilgilerini günceller
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  // Destructure only the fields that exist in the database
  const { name, bio, website } = req.body;

  const updatePayload = {};
  if (name !== undefined) updatePayload.full_name = name;
  if (bio !== undefined) updatePayload.bio = bio;
  if (website !== undefined) updatePayload.website = website;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ error: 'Güncellenecek veri yok.' });
  }

  await knex('influencers').where({ id: influencerId }).update(updatePayload);

  const updatedInfluencer = await knex('influencers').where({ id: influencerId }).first();
  res.json(updatedInfluencer);
}));

// PATCH /api/influencer/me/password - Influencer'ın şifresini günceller
router.patch('/me/password', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const { currentPassword, newPassword } = req.body;

  const influencer = await knex('influencers').where({ id: influencerId }).first();
  if (!influencer) {
    return res.status(404).json({ error: 'Influencer bulunamadı.' });
  }

  const isMatch = await bcrypt.compare(currentPassword, influencer.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Mevcut şifre yanlış.' });
  }

  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  await knex('influencers').where({ id: influencerId }).update({ password_hash: newPasswordHash });

  res.json({ message: 'Şifre başarıyla güncellendi.' });
}));

// GET /api/influencer/social-accounts - Influencer'ın sosyal medya hesaplarını getirir
router.get('/social-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const accounts = await knex('influencer_social_accounts').where({ influencer_id: influencerId });
  res.json({ items: accounts });
}));

// POST /api/influencer/social-accounts - Influencer için yeni sosyal medya hesabı ekler
router.post('/social-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const { platform, handleOrChannel, address, niche, role, followers, avgViews } = req.body;

  const payload = {
    influencer_id: influencerId,
    platform,
    username: handleOrChannel,
    address,
    niche,
    role,
    followers: followers || 0,
    avgViews: avgViews || 0,
  };

  const [newAccountId] = await knex('influencer_social_accounts').insert(payload);
  const newAccount = await knex('influencer_social_accounts').where({ id: newAccountId }).first();
  res.status(201).json(newAccount);
}));

// PUT /api/influencer/social-accounts/:id - Influencer'ın sosyal medya hesabını günceller
router.put('/social-accounts/:id', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const { id } = req.params;
  const { is_active } = req.body;

  const account = await knex('influencer_social_accounts').where({ id, influencer_id: influencerId }).first();
  if (!account) {
    return res.status(404).json({ error: 'Sosyal medya hesabı bulunamadı.' });
  }

  await knex('influencer_social_accounts').where({ id }).update({ is_active });

  const updatedAccount = await knex('influencer_social_accounts').where({ id }).first();
  res.json(updatedAccount);
}));

// DELETE /api/influencer/social-accounts/:id - Influencer'ın sosyal medya hesabını siler
router.delete('/social-accounts/:id', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const { id } = req.params;

  const account = await knex('influencer_social_accounts').where({ id, influencer_id: influencerId }).first();
  if (!account) {
    return res.status(404).json({ error: 'Sosyal medya hesabı bulunamadı.' });
  }

  await knex('influencer_social_accounts').where({ id }).del();
  res.status(204).send();
}));

// GET /api/influencer/payment-accounts - Influencer'ın ödeme hesaplarını getirir
router.get('/payment-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const accounts = await knex('influencer_payment_accounts').where({ influencer_id: influencerId });
  res.json({ items: accounts });
}));

// POST /api/influencer/payment-accounts - Influencer için yeni ödeme hesabı ekler
router.post('/payment-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const influencerId = req.user.userId;
  const { bank_name, account_holder_name, iban } = req.body;

  // Diğer tüm hesapları pasif yap
  await knex('influencer_payment_accounts').where({ influencer_id: influencerId }).update({ is_active: false });

  const payload = {
    influencer_id: influencerId,
    bank_name,
    account_holder_name,
    iban,
    is_active: true
  };

  const [newAccountId] = await knex('influencer_payment_accounts').insert(payload);
  const newAccount = await knex('influencer_payment_accounts').where({ id: newAccountId }).first();
  res.status(201).json(newAccount);
}));


// GET /api/influencers - Admin için influencer listeleme
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, start_date, end_date, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    const validSortBy = ['created_at', 'full_name', 'brand_name', 'balance'];
    const validSortOrder = ['asc', 'desc'];

    const orderBy = validSortBy.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrder.includes(sortOrder) ? sortOrder : 'desc';

    const influencersQuery = knex('influencers')
        .select(
            'influencers.id',
            'influencers.full_name as name',
            'influencers.email',
            'influencers.brand_name',
            'influencers.status',
            'influencers.created_at',
            knex.raw('(COALESCE(commissions.total_commission, 0) - COALESCE(payouts.total_paid, 0)) as balance')
        )
        .leftJoin(knex.raw('(SELECT discount_codes.influencer_id, SUM(sales.commission) as total_commission FROM sales JOIN discount_codes ON sales.code = discount_codes.code GROUP BY discount_codes.influencer_id) as commissions'), 'influencers.id', 'commissions.influencer_id')
        .leftJoin(knex.raw('(SELECT influencer_id, SUM(amount) as total_paid FROM payouts WHERE status = \'completed\' GROUP BY influencer_id) as payouts'), 'influencers.id', 'payouts.influencer_id')
        .where('role', 'influencer')
        .limit(limit)
        .offset(offset);

    let countQuery = knex('influencers')
        .where('role', 'influencer');

    if (search) {
        const searchLike = `%${search}%`;
        const whereBuilder = function() {
            this.where('full_name', 'like', searchLike)
                .orWhere('email', 'like', searchLike)
                .orWhere('brand_name', 'like', searchLike)
                .orWhereExists(function() {
                    this.select(1)
                        .from('discount_codes')
                        .whereRaw('discount_codes.influencer_id = influencers.id')
                        .andWhere('discount_codes.code', 'like', searchLike);
                });
        };
        influencersQuery.where(whereBuilder);
        countQuery.where(whereBuilder);
    }

    if (start_date) {
        influencersQuery.where('influencers.created_at', '>=', start_date);
        countQuery.where('influencers.created_at', '>=', start_date);
    }

    if (end_date) {
        influencersQuery.where('influencers.created_at', '<=', end_date);
        countQuery.where('influencers.created_at', '<=', end_date);
    }

    influencersQuery.orderBy(orderBy, order);

    const influencers = await influencersQuery;
    const totalResult = await countQuery.count('id as count').first();
    const total = totalResult.count;

    for (let i = 0; i < influencers.length; i++) {
        const codes = await knex('discount_codes')
            .select('code', 'is_active')
            .where('influencer_id', influencers[i].id);
        influencers[i].codes = codes;
    }

    res.json({
        items: influencers,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// GET /api/influencers/:id - Admin için tek bir influencer detayı
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const influencer = await knex('influencers')
        .select(
            'id',
            'full_name as name',
            'email',
            'brand_name',
            'status',
            'notes',
            'created_at',
            'updated_at'
        )
        .where({ id, role: 'influencer' })
        .first();

    if (!influencer) {
        return res.status(404).json({ error: 'Influencer bulunamadı.' });
    }

    res.json(influencer);
}));

// GET /api/influencers/:id/social-accounts - Admin için bir influencer'ın sosyal hesaplarını getirir
router.get('/:id/social-accounts', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const accounts = await knex('influencer_social_accounts').where({ influencer_id: id });
    res.json({ items: accounts });
}));

// PATCH /api/influencers/:id/social-accounts/:accountId - Admin için sosyal hesap güncelleme
router.patch('/:id/social-accounts/:accountId', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const updateData = req.body;
    // Güvenlik: influencer_id ve id alanlarının güncellenmesini engelle
    delete updateData.id;
    delete updateData.influencer_id;

    const account = await knex('influencer_social_accounts').where({ id: accountId }).first();
    if (!account) {
        return res.status(404).json({ error: 'Sosyal hesap bulunamadı.' });
    }

    await knex('influencer_social_accounts').where({ id: accountId }).update(updateData);
    const updatedAccount = await knex('influencer_social_accounts').where({ id: accountId }).first();
    res.json(updatedAccount);
}));

// DELETE /api/influencers/:id/social-accounts/:accountId - Admin için sosyal hesap silme
router.delete('/:id/social-accounts/:accountId', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const account = await knex('influencer_social_accounts').where({ id: accountId }).first();
    if (!account) {
        return res.status(404).json({ error: 'Sosyal hesap bulunamadı.' });
    }
    await knex('influencer_social_accounts').where({ id: accountId }).del();
    res.status(204).send();
}));


// GET /api/influencers/:id/payment-accounts - Admin için bir influencer'ın ödeme hesaplarını getirir
router.get('/:id/payment-accounts', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const accounts = await knex('influencer_payment_accounts').where({ influencer_id: id });
    res.json({ items: accounts });
}));

// DELETE /api/influencers/:id/payment-accounts/:accountId - Admin için ödeme hesabı silme
router.delete('/:id/payment-accounts/:accountId', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const account = await knex('influencer_payment_accounts').where({ id: accountId }).first();
    if (!account) {
        return res.status(404).json({ error: 'Ödeme hesabı bulunamadı.' });
    }
    await knex('influencer_payment_accounts').where({ id: accountId }).del();
    res.status(204).send();
}));

// PATCH /api/influencers/:id - Admin için influencer güncelleme
router.patch('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, brand_name, status, notes } = req.body;

    const influencer = await knex('influencers')
        .where({ id, role: 'influencer' })
        .first();

    if (!influencer) {
        return res.status(404).json({ error: 'Güncellenecek influencer bulunamadı.' });
    }

    const updatePayload = {};
    if (name !== undefined) updatePayload.full_name = name;
    if (email !== undefined) updatePayload.email = email;
    if (brand_name !== undefined) updatePayload.brand_name = brand_name;
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    
    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ error: 'Güncellenecek veri bulunamadı.' });
    }
    
    updatePayload.updated_at = toSqliteDatetime(new Date());

    await knex('influencers')
        .where({ id })
        .update(updatePayload);

    const updatedInfluencer = await knex('influencers')
        .select(
            'id',
            'full_name as name',
            'email',
            'brand_name',
            'status',
            'notes',
            'created_at',
            'updated_at'
        )
        .where({ id })
        .first();

    res.json(updatedInfluencer);
}));

module.exports = router;