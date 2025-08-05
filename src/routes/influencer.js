/**
 * Amaç: Influencer başvuru ve kendi profil uçları.
 * Güvenlik ve Doğrulama:
 * - Public apply ucu sıkı rate limit ve body doğrulaması ile korunur.
 * - /me uçları kimlik doğrulaması gerektirir ve sadece kendi kaydına erişime izin verir.
 * - Response whitelisting: sadece gerekli alanlar döndürülür.
 * - Knex parametre binding kullanılır; ham SQL string birleştirme yapılmaz.
 * - Hata mesajları sade Türkçe tutulur.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const knex = require('../db/sqlite');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Whitelist yardımcı fonksiyon
function pickInfluencerFields(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    social_handle: row.social_handle,
    niche: row.niche,
    channels: safeParseJSON(row.channels),
    country: row.country,
    terms_accepted: !!row.terms_accepted,
    status: row.status,
    bio: row.bio,
    website: row.website,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeParseJSON(text) {
  if (text == null) return null;
  try {
    return typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
}

// Rate limiters
const applyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dk
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla başvuru denemesi, lütfen daha sonra tekrar deneyin.' },
});

const meLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dk
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek, lütfen daha sonra tekrar deneyin.' },
});

// Basit doğrulama yardımcıları
function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function nonEmptyString(s, min = 1) {
  return typeof s === 'string' && s.trim().length >= min;
}
function isUrlOptional(s) {
  if (s == null) return true;
  if (s === '') return true;
  try {
    // basit URL doğrulaması
    const u = new URL(s);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}
function isArrayOfStrings(a) {
  return Array.isArray(a) && a.every((v) => typeof v === 'string' && v.trim().length > 0);
}

// POST /influencers/apply (public)
router.post('/apply', applyLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      social_handle,
      niche,
      channels,
      country,
      terms_accepted,
      bio,
      website,
    } = req.body || {};

    const errors = [];
    if (!nonEmptyString(name, 2)) errors.push('İsim en az 2 karakter olmalıdır');
    if (!isEmail(email)) errors.push('Geçerli bir email adresi giriniz');
    if (!nonEmptyString(social_handle, 2)) errors.push('Sosyal hesap bilgisi gerekli');
    if (!nonEmptyString(niche, 2)) errors.push('Niche alanı en az 2 karakter olmalıdır');
    if (!isArrayOfStrings(channels) || channels.length === 0) errors.push('Channels en az bir öğe içeren dizi olmalıdır');
    if (!nonEmptyString(country, 2)) errors.push('Ülke bilgisi gerekli');
    if (terms_accepted !== true) errors.push('Şartlar kabul edilmelidir');
    if (bio != null && !nonEmptyString(bio, 1)) errors.push('Bio boş olmamalıdır');
    if (!isUrlOptional(website)) errors.push('Geçerli bir website adresi giriniz');

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const now = knex.fn.now();

    // Email benzersizliği: unique ihlalini yakalayıp 409 döndür
    try {
      const [id] = await knex('influencers').insert({
        user_id: null, // public başvuru; henüz kullanıcı hesabına bağlı değil
        name,
        email,
        social_handle,
        niche,
        channels: JSON.stringify(channels),
        country,
        terms_accepted: true,
        status: 'pending',
        bio: bio || null,
        website: website || null,
        created_at: now,
        updated_at: now,
      });
      const created = await knex('influencers').where({ id }).first();
      return res.status(201).json(pickInfluencerFields(created));
    } catch (e) {
      // SQLite: UNIQUE constraint failed: influencers.email
      const msg = (e && String(e.message || e)).toLowerCase();
      if (msg.includes('unique') && msg.includes('email')) {
        return res.status(409).json({ error: 'Bu e-posta ile zaten başvuru mevcut' });
      }
      return res.status(500).json({ error: 'Başvuru kaydı sırasında hata oluştu' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Beklenmeyen bir hata oluştu' });
  }
});

// Korumalı uçlar: /influencers/me*
router.use(authenticateToken, meLimiter);

// Yardımcı: kimliği belirle (user_id ile çalış)
function resolveUserId(req) {
  // auth middleware farklı bir şema kullanıyor olabilir; güvenli şekilde seç
  return (req.user && (req.user.user_id || req.user.id)) || null;
}

// GET /influencers/me
router.get('/me', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const row = await knex('influencers').where('user_id', userId).first();
    if (!row) return res.status(404).json({ error: 'Kayıt bulunamadı' });

    return res.json(pickInfluencerFields(row));
  } catch (err) {
    return res.status(500).json({ error: 'Kayıt getirme sırasında hata oluştu' });
  }
});

// PATCH /influencers/me
router.patch('/me', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const {
      name,
      social_handle,
      niche,
      channels,
      country,
      bio,
      website,
      email,
      status,
    } = req.body || {};

    // Yasak alanlar
    if (email !== undefined || status !== undefined) {
      return res.status(400).json({ error: 'email veya status güncellenemez' });
    }

    const updates = {};
    const errors = [];

    if (name !== undefined) {
      if (!nonEmptyString(name, 2)) errors.push('İsim en az 2 karakter olmalıdır');
      else updates.name = name;
    }
    if (social_handle !== undefined) {
      if (!nonEmptyString(social_handle, 2)) errors.push('Sosyal hesap bilgisi geçersiz');
      else updates.social_handle = social_handle;
    }
    if (niche !== undefined) {
      if (!nonEmptyString(niche, 2)) errors.push('Niche alanı en az 2 karakter olmalıdır');
      else updates.niche = niche;
    }
    if (channels !== undefined) {
      if (!isArrayOfStrings(channels) || channels.length === 0) {
        errors.push('Channels en az bir öğe içeren dizi olmalıdır');
      } else {
        updates.channels = JSON.stringify(channels);
      }
    }
    if (country !== undefined) {
      if (!nonEmptyString(country, 2)) errors.push('Ülke bilgisi geçersiz');
      else updates.country = country;
    }
    if (bio !== undefined) {
      if (bio != null && !nonEmptyString(bio, 1)) errors.push('Bio boş olmamalıdır');
      else updates.bio = bio || null;
    }
    if (website !== undefined) {
      if (!isUrlOptional(website)) errors.push('Geçerli bir website adresi giriniz');
      else updates.website = website || null;
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan bulunamadı' });
    }

    updates.updated_at = knex.fn.now();

    const affected = await knex('influencers').where('user_id', userId).update(updates);
    if (!affected) {
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }

    const row = await knex('influencers').where('user_id', userId).first();
    return res.json(pickInfluencerFields(row));
  } catch (err) {
    return res.status(500).json({ error: 'Güncelleme sırasında hata oluştu' });
  }
});

// GET /influencers/me/summary
router.get('/me/summary', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const row = await knex('influencers')
      .select('status', 'created_at')
      .where('user_id', userId)
      .first();

    if (!row) return res.status(404).json({ error: 'Kayıt bulunamadı' });

    // Basit özet: durum, oluşturulma tarihi ve başvuru gün sayısı
    const createdAt = new Date(row.created_at);
    const daysSince = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000)));

    return res.json({
      status: row.status,
      created_at: row.created_at,
      days_since_application: daysSince,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Özet alınırken hata oluştu' });
  }
});

module.exports = router;