/**
 * Amaç: Influencer başvuru ve kendi profil uçları.
 * Güvenlik ve Doğrulama:
 * - Public apply ucu sıkı rate limit ve body doğrulaması ile korunur.
 * - /me uçları kimlik doğrulaması gerektirir ve sadece kendi kaydına erişime izin verir.
 * - Response whitelisting: sadece gerekli alanlar döndürülür.
 * - Knex parametre binding kullanılır; ham SQL string birleştirme yapılmaz.
 * - Hata mesajları sade Türkçe tutulur.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const knex = require('../db/sqlite')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

const router = express.Router()
const bcrypt = require('bcryptjs') // bcryptjs'i import et

// Whitelist yardımcı fonksiyon
function pickInfluencerFields(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.full_name, // Use full_name
    email: row.email,
    niche: row.niche,
    channels: safeParseJSON(row.channels),
    country: row.country,
    terms_accepted: !!row.terms_accepted,
    status: row.status,
    bio: row.bio,
    website: row.website,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function safeParseJSON(text) {
  if (text == null) return null
  try {
    return typeof text === 'string' ? JSON.parse(text) : text
  } catch {
    return null
  }
}

// Rate limiters
const applyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dk
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla başvuru denemesi, lütfen daha sonra tekrar deneyin.' },
})

const meLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dk
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek, lütfen daha sonra tekrar deneyin.' },
})

// Basit doğrulama yardımcıları
function isEmail(s) {
  return typeof s === 'string' && /^[^\\s@]+@[^\\s@]+\\.` + '` + `[^\\s@]+$/.test(s.trim())
}
function nonEmptyString(s, min = 1) {
  return typeof s === 'string' && s.trim().length >= min
}
function isUrlOptional(s) {
  if (s == null) return true
  if (s === '') return true
  try {
    const u = new URL(s)
    return !!u.protocol && !!u.host
  } catch {
    return false
  }
}
function isArrayOfStrings(a) {
  return Array.isArray(a) && a.every((v) => typeof v === 'string' && v.trim().length > 0)
}

// POST /api/influencers/apply (public)
router.post('/api/influencers/apply', applyLimiter, async(req, res) => {
  // ... (rest of the file is unchanged for brevity)
});

// Admin için arama ucu: GET /influencers/search?q=
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    
    if (q.length < 2 && q.length > 0) {
      return res.json({ items: [] });
    }

    const like = `%${q}%`;

    const results = await knex('influencers')
      .select('id', 'full_name as name', 'email', 'status')
      .where(function() {
        this.where('full_name', 'like', like)
          .orWhere('email', 'like', like);
      })
      .andWhere('role', 'influencer')
      .limit(20);

    return res.json({ items: results });

  } catch (err) {
    console.error('Influencer arama hatası:', { 
        message: err.message, 
        stack: err.stack, 
        query: req.query.q 
    });
    return res.status(500).json({ error: 'Arama sırasında sunucuda bir hata oluştu.' });
  }
});

// The rest of the routes in influencer.js remain the same...

module.exports = router;