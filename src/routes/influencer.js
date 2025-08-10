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
const bcrypt = require('bcryptjs'); // bcryptjs'i import et

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
      console.error('Başvuru kaydı hatası:', e); // Hata mesajını logla
      return res.status(500).json({ error: 'Başvuru kaydı sırasında hata oluştu', details: e.message }); // Detayları da döndür
    }
  } catch (err) {
    return res.status(500).json({ error: 'Beklenmeyen bir hata oluştu' });
  }
});

// Admin için arama ucu: GET /influencers/search?q=
// - q; indirim kodu, social_handle (hesap adı), ad soyad (name/full_name) alanlarında arar
// - Sadece admin kullanıcılar erişmelidir; mevcut authenticateToken kullanıcıyı yüklüyor,
//   role kontrolü basitçe req.user.role === 'admin' ile yapılır.
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Arama terimi en az 2 karakter olmalıdır' });
    }

    const like = `%${q}%`;

    // Influencer alanları: name, full_name (bazı migrationlarda değişken), social_handle
    // Discount code ile ilişki: discount_codes.influencer_id
    // Not: full_name kolonu bazı şemalarda var; yoksa COALESCE(name, '') kullanılacak.
    const results = await knex('influencers as i')
      .leftJoin('discount_codes as d', 'd.influencer_id', 'i.id')
      .select(
        'i.id',
        knex.raw("COALESCE(i.full_name, i.name) as display_name"),
        'i.email',
        'i.social_handle',
        'i.status',
        knex.raw('GROUP_CONCAT(DISTINCT d.code) as codes')
      )
      .where(function() {
        this.where('i.social_handle', 'like', like)
          .orWhere('i.name', 'like', like)
          .orWhere('i.full_name', 'like', like)
          .orWhere('d.code', 'like', like);
      })
      .groupBy('i.id')
      .orderBy('i.id', 'desc')
      .limit(50);

    // codes virgülle birikmiş olabilir, diziye dönüştürelim
    const items = results.map(r => ({
      id: r.id,
      name: r.display_name,
      email: r.email,
      social_handle: r.social_handle,
      status: r.status,
      codes: r.codes ? String(r.codes).split(',') : []
    }));

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: 'Arama sırasında hata oluştu' });
  }
});

// Korumalı uçlar: /influencers/me*
router.use(authenticateToken, meLimiter);

// Yardımcı: kimliği belirle (user_id ile çalış)
function resolveUserId(req) {
  const userId = (req.user && (req.user.user_id || req.user.id)) || null;
  console.log(`[resolveUserId] Token user: ${JSON.stringify(req.user)}, resolved ID: ${userId}`);
  return userId;
}

// GET /influencers/me
router.get('/me', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const row = await knex('influencers').where('id', userId).first();
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

    const affected = await knex('influencers').where('id', userId).update(updates);
    if (!affected) {
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }

    const row = await knex('influencers').where('id', userId).first();
    return res.json(pickInfluencerFields(row));
  } catch (err) {
    return res.status(500).json({ error: 'Güncelleme sırasında hata oluştu' });
  }
});

// PATCH /influencers/me/password (Şifre değiştirme)
router.patch('/me/password', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mevcut ve yeni şifre gerekli' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const influencer = await knex('influencers').where('id', userId).first();
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer bulunamadı' });
    }

    // Mevcut şifreyi doğrula
    const isMatch = await bcrypt.compare(currentPassword, influencer.password_hash || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    }

    // Yeni şifreyi hash'le ve güncelle
    const newPasswordHash = await bcrypt.hash(newPassword, 11); // bcrypt cost 11
    await knex('influencers')
      .where('id', userId) // Use 'id' column instead of 'user_id'
      .update({ password_hash: newPasswordHash, updated_at: knex.fn.now() });

    return res.json({ message: 'Şifre başarıyla güncellendi.' });
  } catch (err) {
    console.error('Şifre güncelleme hatası:', err);
    return res.status(500).json({ error: 'Şifre güncelleme sırasında hata oluştu' });
  }
});

// GET /influencers/me/summary
router.get('/me/summary', async (req, res) => {
  try {
    console.log('[DEBUG] /me/summary: resolving user ID');
    const userId = resolveUserId(req);
    if (!userId) {
      console.log('[WARN] /me/summary: no user ID found');
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    }

    console.log(`[DEBUG] /me/summary: fetching influencer data for user ID ${userId}`);
    const row = await knex('influencers')
      .select(
        'status',
        'created_at',
        // Calculate days since application directly in SQLite
        knex.raw("CAST((JULIANDAY('now') - JULIANDAY(created_at)) AS INTEGER) AS days_since_application")
      )
      .where('user_id', userId)
      .first();

    if (!row) {
      console.log(`[WARN] /me/summary: no influencer found for user ID ${userId}`);
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }

    console.log('[DEBUG] /me/summary: row data:', row);
    const result = {
      status: row.status,
      created_at: row.created_at,
      days_since_application: Math.max(0, row.days_since_application || 0),
    };
    console.log('[DEBUG] /me/summary: returning result:', result);
    return res.json(result);
  } catch (err) {
    console.error('[ERROR] /me/summary error:', err);
    return res.status(500).json({
      error: 'Özet alınırken hata oluştu',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Sosyal medya hesapları yönetimi
router.get('/me/social-accounts', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const accounts = await knex('influencer_social_accounts')
      .where('influencer_id', userId)
      .select('id', 'platform', 'handle', 'url', 'is_active', 'created_at', 'updated_at');

    return res.json(accounts);
  } catch (err) {
    console.error('Sosyal hesapları getirme hatası:', err);
    return res.status(500).json({ error: 'Sosyal hesapları getirilirken hata oluştu' });
  }
});

router.post('/me/social-accounts', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const { platform, handle, url } = req.body || {};

    if (!platform || !handle) {
      return res.status(400).json({ error: 'Platform ve hesap adı gerekli' });
    }

    const now = knex.fn.now();
    const [id] = await knex('influencer_social_accounts').insert({
      influencer_id: userId,
      platform,
      handle,
      url: url || null,
      created_at: now,
      updated_at: now,
    });

    const newAccount = await knex('influencer_social_accounts').where({ id }).first();
    return res.status(201).json(newAccount);
  } catch (err) {
    console.error('Sosyal hesap ekleme hatası:', err);
    return res.status(500).json({ error: 'Sosyal hesap eklenirken hata oluştu' });
  }
});

router.patch('/me/social-accounts/:id', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const { id } = req.params;
    const { platform, handle, url, is_active } = req.body || {};

    const updates = {};
    if (platform !== undefined) updates.platform = platform;
    if (handle !== undefined) updates.handle = handle;
    if (url !== undefined) updates.url = url;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan bulunamadı' });
    }

    updates.updated_at = knex.fn.now();

    const affected = await knex('influencer_social_accounts')
      .where('id', id)
      .where('influencer_id', userId)
      .update(updates);

    if (!affected) {
      return res.status(404).json({ error: 'Sosyal hesap bulunamadı veya yetkiniz yok' });
    }

    const updatedAccount = await knex('influencer_social_accounts').where('id', id).first();
    return res.json(updatedAccount);
  } catch (err) {
    console.error('Sosyal hesap güncelleme hatası:', err);
    return res.status(500).json({ error: 'Sosyal hesap güncellenirken hata oluştu' });
  }
});

router.delete('/me/social-accounts/:id', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const { id } = req.params;

    const affected = await knex('influencer_social_accounts')
      .where('id', id)
      .where('influencer_id', userId)
      .del();

    if (!affected) {
      return res.status(404).json({ error: 'Sosyal hesap bulunamadı veya yetkiniz yok' });
    }

    return res.status(204).send(); // No Content
  } catch (err) {
    console.error('Sosyal hesap silme hatası:', err);
    return res.status(500).json({ error: 'Sosyal hesap silinirken hata oluştu' });
  }
});

// Ödeme hesapları yönetimi
router.get('/me/payment-accounts', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const accounts = await knex('influencer_payment_accounts')
      .where('influencer_id', userId)
      .select('id', 'bank_name', 'account_holder_name', 'iban', 'is_active', 'created_at', 'updated_at');

    return res.json(accounts);
  } catch (err) {
    console.error('Ödeme hesapları getirme hatası:', err);
    return res.status(500).json({ error: 'Ödeme hesapları getirilirken hata oluştu' });
  }
});

router.post('/me/payment-accounts', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const { bank_name, account_holder_name, iban } = req.body || {};

    if (!bank_name || !account_holder_name || !iban) {
      return res.status(400).json({ error: 'Banka adı, hesap sahibi adı ve IBAN gerekli' });
    }

    const now = knex.fn.now();

    // Mevcut aktif hesapları pasif yap
    await knex('influencer_payment_accounts')
      .where('influencer_id', userId)
      .where('is_active', true)
      .update({ is_active: false, updated_at: now });

    const [id] = await knex('influencer_payment_accounts').insert({
      influencer_id: userId,
      bank_name,
      account_holder_name,
      iban,
      is_active: true, // Yeni hesap aktif olacak
      created_at: now,
      updated_at: now,
    });

    const newAccount = await knex('influencer_payment_accounts').where({ id }).first();
    return res.status(201).json(newAccount);
  } catch (err) {
    console.error('Ödeme hesabı ekleme hatası:', err);
    return res.status(500).json({ error: 'Ödeme hesabı eklenirken hata oluştu' });
  }
});

module.exports = router;