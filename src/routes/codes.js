const router = require('express').Router();
const knex = require('../db/sqlite');

// Tüm indirim kodlarını listele
router.get('/codes', async (req, res) => {
  try {
    const codes = await knex('discount_codes')
      .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
      .select(
        'discount_codes.id',
        'discount_codes.code',
        'discount_codes.discount_pct',
        'discount_codes.commission_pct',
        'discount_codes.is_active',
        'discount_codes.created_at',
        'influencers.full_name as influencer_name',
        'influencers.email as influencer_email'
      )
      .orderBy('discount_codes.created_at', 'desc');
    
    res.json({ codes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tek bir kod detayını getir
router.get('/codes/:id', async (req, res) => {
  try {
    const code = await knex('discount_codes')
      .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
      .select(
        'discount_codes.*',
        'influencers.full_name as influencer_name',
        'influencers.email as influencer_email'
      )
      .where('discount_codes.id', req.params.id)
      .first();
    
    if (!code) return res.status(404).json({ error: 'Kod bulunamadı' });
    
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yeni indirim kodu oluştur
router.post('/codes', async (req, res) => {
  try {
    const { influencer_id, code, discount_percentage, commission_pct = 10 } = req.body;
    
    if (!influencer_id || !code || !discount_percentage) {
      return res.status(400).json({ error: 'Eksik alanlar' });
    }
    
    // Validasyon
    if (discount_percentage < 1 || discount_percentage > 100 || commission_pct < 1 || commission_pct > 100) {
      return res.status(400).json({ error: 'Yüzde değerleri 1-100 arasında olmalı' });
    }
    
    // Influencer kontrolü
    const influencer = await knex('influencers').where('id', influencer_id).first();
    if (!influencer) return res.status(404).json({ error: 'Influencer bulunamadı' });
    
    const [id] = await knex('discount_codes').insert({
      influencer_id,
      code: code.toUpperCase(),
      discount_pct: discount_percentage,
      commission_pct,
      is_active: true
    });
    
    const newCode = await knex('discount_codes')
      .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
      .select(
        'discount_codes.*',
        'influencers.full_name as influencer_name'
      )
      .where('discount_codes.id', id)
      .first();
    
    res.status(201).json({
      message: 'İndirim kodu oluşturuldu',
      code_id: id,
      code: newCode
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bu kod zaten kullanımda' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Kod güncelle
router.put('/codes/:id', async (req, res) => {
  try {
    const { discount_pct, commission_pct, is_active } = req.body;
    
    const code = await knex('discount_codes').where('id', req.params.id).first();
    if (!code) return res.status(404).json({ error: 'Kod bulunamadı' });
    
    // Validasyon
    if (discount_pct && (discount_pct < 1 || discount_pct > 100)) {
      return res.status(400).json({ error: 'İndirim yüzdesi 1-100 arasında olmalı' });
    }
    
    if (commission_pct && (commission_pct < 1 || commission_pct > 100)) {
      return res.status(400).json({ error: 'Komisyon yüzdesi 1-100 arasında olmalı' });
    }
    
    await knex('discount_codes')
      .where('id', req.params.id)
      .update({
        discount_pct: discount_pct || code.discount_pct,
        commission_pct: commission_pct || code.commission_pct,
        is_active: is_active !== undefined ? is_active : code.is_active
      });
    
    const updatedCode = await knex('discount_codes')
      .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
      .select(
        'discount_codes.*',
        'influencers.full_name as influencer_name'
      )
      .where('discount_codes.id', req.params.id)
      .first();
    
    res.json(updatedCode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kod sil (soft delete yerine tamamen sil)
router.delete('/codes/:id', async (req, res) => {
  try {
    const deleted = await knex('discount_codes')
      .where('id', req.params.id)
      .del();
    
    if (!deleted) return res.status(404).json({ error: 'Kod bulunamadı' });
    
    res.json({ message: 'Kod başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;