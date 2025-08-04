const router = require('express').Router();
const knex = require('../db/sqlite');
const { validateInfluencerApplication } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Influencer başvurusu oluşturma
router.post('/apply', validateInfluencerApplication, asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    social_media,
    followers,
    iban,
    tax_type = 'individual',
    about = '',
    message = ''
  } = req.body;

  // Email kontrolü
  const existingInfluencer = await knex('influencers').where('email', email).first();
  if (existingInfluencer) {
    return res.status(409).json({ error: 'Bu email adresi ile zaten başvuru yapılmış' });
  }

  // Influencer kaydı oluştur
  const [influencerId] = await knex('influencers').insert({
    full_name,
    email,
    phone,
    social_media: JSON.stringify(social_media || []),
    followers: parseInt(followers) || 0,
    iban,
    tax_type,
    about,
    message,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  });

  res.status(201).json({
    message: 'Başvurunuz başarıyla alındı',
    influencer_id: influencerId,
    status: 'pending'
  });
}));

// Tüm başvuruları listeleme (admin için)
router.get('/apply', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  let query = knex('influencers')
    .select(
      'id',
      'full_name',
      'email',
      'phone',
      'followers',
      'status',
      'created_at',
      'updated_at'
    )
    .orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', status);
  }

  const offset = (page - 1) * limit;
  const influencers = await query.limit(limit).offset(offset);
  
  const total = await knex('influencers')
    .where(builder => {
      if (status) builder.where('status', status);
    })
    .count('* as count')
    .first();

  res.json({
    influencers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total.count,
      pages: Math.ceil(total.count / limit)
    }
  });
}));

// Başvuru durumu kontrolü
router.get('/apply/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const influencer = await knex('influencers')
    .where('id', id)
    .select(
      'id',
      'full_name',
      'email',
      'phone',
      'social_media',
      'followers',
      'status',
      'about',
      'message',
      'created_at',
      'updated_at'
    )
    .first();

  if (!influencer) {
    return res.status(404).json({ error: 'Başvuru bulunamadı' });
  }

  res.json({ influencer });
}));

// Başvuru durumu güncelleme (admin için)
router.patch('/apply/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }

  const updated = await knex('influencers')
    .where('id', id)
    .update({
      status,
      updated_at: new Date()
    });

  if (!updated) {
    return res.status(404).json({ error: 'Başvuru bulunamadı' });
  }

  res.json({ message: 'Başvuru durumu güncellendi', status });
}));

module.exports = router;