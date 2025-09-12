const express = require('express');
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

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
      'brand_name',
      'status',
      'created_at',
      'updated_at'
    )
    .where({ id: influencerId, role: 'influencer' })
    .first();

  if (!influencer) {
    return res.status(404).json({ error: 'Influencer bulunamadı.' });
  }

  res.json(influencer);
}));


// GET /api/influencers - Admin için influencer listeleme


// GET /api/influencers - Admin için influencer listeleme
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let influencersQuery = knex('influencers')
        .select(
            'id',
            'full_name as name',
            'email',
            'brand_name',
            'status',
            'created_at'
        )
        .where('role', 'influencer')
        .orderBy(knex.raw('datetime(created_at)'), 'desc')
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
        influencersQuery.where('created_at', '>=', start_date);
        countQuery.where('created_at', '>=', start_date);
    }

    if (end_date) {
        influencersQuery.where('created_at', '<=', end_date);
        countQuery.where('created_at', '<=', end_date);
    }

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
    
    updatePayload.updated_at = new Date();

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