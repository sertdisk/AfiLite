/*
  Bu dosya: Kimlik doğrulama ve yetkilendirme yardımcıları.
  Amaç: JWT doğrulama, rol kontrolleri ve kaynak erişim yetkisi.
*/
const jwt = require('jsonwebtoken');
const knex = require('../db/sqlite');

// JWT secret sadece environment'tan gelir; fallback yok (sertleştirme)
const JWT_SECRET = process.env.JWT_SECRET;

// Token doğrulama middleware'i (erişim kontrolü)
const authenticateToken = async (req, res, next) => {
  try {
    // Öncelik: Authorization: Bearer
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[0] === 'Bearer'
      ? authHeader.split(' ')[1]
      : undefined;

    // Fallback: HttpOnly cookie "jwt"
    if (!token) {
      // Express'te cookie-parser yoksa, header'dan manuel çekelim
      const rawCookie = req.headers['cookie'] || '';
      const jwtCookie = rawCookie.split(';').map(s => s.trim()).find(s => s.startsWith('jwt='));
      if (jwtCookie) {
        token = decodeURIComponent(jwtCookie.substring('jwt='.length + 0).split('=')[1] || jwtCookie.split('=')[1]);
        // Güvenlik: boş string olmasın
        if (token === '') token = undefined;
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Access token gerekli' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Not: Token payload şeması farklı olabilir.
    // Yaygın alan adları: userId | sub
    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({ error: 'Geçersiz token payload' });
    }

    // Kullanıcıyı veritabanından kontrol et (varlık ve durum)
    const user = await knex('influencers').where('id', userId).first();
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz token' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token süresi dolmuş' });
    }
    res.status(500).json({ error: 'Token doğrulama hatası' });
  }
};

// Admin yetkisi kontrolü (rol kontrol)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

// Influencer yetkisi kontrolü (rol kontrol)
const requireInfluencer = (req, res, next) => {
  if (!req.user || req.user.role !== 'influencer') {
    return res.status(403).json({ error: 'Influencer yetkisi gerekli' });
  }
  next();
};

// Kendi kaynaklarına erişim kontrolü (sahiplik doğrulama)
const authorizeResourceAccess = (resourceParam) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceParam];

      if (!resourceId) {
        return res.status(400).json({ error: 'Kaynak ID gerekli' });
      }

      // Admin kullanıcılar her şeye erişebilir
      if (req.user.role === 'admin') {
        return next();
      }

      // Influencer kullanıcılar sadece kendi kaynaklarına erişebilir
      if (req.user.role === 'influencer') {
        // Influencer'ın kendi kaynağı
        if (resourceParam === 'influencer_id') {
          const resourceIdNum = typeof resourceId === 'string' ? parseInt(resourceId, 10) : resourceId;
          if (resourceIdNum !== req.user.id) {
            return res.status(403).json({ error: 'Bu kaynağa erişim yetkiniz yok' });
          }
        }

        // Discount code sahiplik kontrolü
        if (resourceParam === 'code_id') {
          const code = await knex('discount_codes')
            .where('id', resourceId)
            .where('influencer_id', req.user.id)
            .first();

          if (!code) {
            return res.status(403).json({ error: 'Bu koda erişim yetkiniz yok' });
          }
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Yetki kontrolü hatası' });
    }
  };
};

// API key authentication (admin için)
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key gerekli' });
    }

    const user = await knex('influencers')
      .where('api_key', apiKey)
      .where('role', 'admin')
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz API key' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'API key doğrulama hatası' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInfluencer,
  authorizeResourceAccess,
  authenticateApiKey,
  JWT_SECRET
};