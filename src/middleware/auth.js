/*
  Bu dosya: Kimlik doğrulama ve yetkilendirme yardımcıları.
  Amaç: JWT doğrulama, rol kontrolleri ve kaynak erişim yetkisi.
*/
const jwt = require('jsonwebtoken');
const knex = require('../db/sqlite');

// JWT secret geçici olarak sabit bir değer atanıyor
const JWT_SECRET = process.env.JWT_SECRET || 'geciciSecretKey123!';

// Token doğrulama middleware'i (erişim kontrolü)
const authenticateToken = async (req, res, next) => {
  console.log('[AUTH DEBUG] authenticateToken middleware çalışıyor, URL:', req.url); // DEBUG LOG
  console.log('[AUTH DEBUG] Tüm headerlar:', req.headers); // DEBUG LOG
  try {
    // Öncelik: Authorization: Bearer
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[0] === 'Bearer'
      ? authHeader.split(' ')[1]
      : undefined;

    // Fallback: HttpOnly cookie "jwt" veya "jwt_influencer"
    if (!token) {
      // Express'te cookie-parser yoksa, header'dan manuel çekelim
      const rawCookie = req.headers['cookie'] || '';
      console.log('[AUTH DEBUG] Raw cookie header:', rawCookie); // DEBUG LOG
      
      // Tüm olası JWT cookie isimlerini kontrol et
      const jwtCookieNames = ['jwt', 'jwt_influencer', 'jwt_admin'];
      for (const cookieName of jwtCookieNames) {
        const cookie = rawCookie
          .split(';')
          .map(s => s.trim())
          .find(s => s.startsWith(`${cookieName}=`));
        
        if (cookie) {
          token = cookie.split('=')[1];
          console.log(`[AUTH DEBUG] ${cookieName} cookie bulundu:`, token); // DEBUG LOG
          // Güvenlik: boş string olmasın
          if (token === '') token = undefined;
          if (token) break; // Token bulundu, döngüden çık
        }
      }
      
      // Ek hata ayıklama: cookie bulunamadıysa detaylı log
      if (!token) {
        console.log('[AUTH DEBUG] Cookie bulunamadı. Mevcut headerlar:', Object.keys(req.headers));
        console.log('[AUTH DEBUG] Cookie header içeriği:', req.headers['cookie']);
      }
    }

    if (!token) {
      console.log('[AUTH DEBUG] Token bulunamadı'); // DEBUG LOG
      return res.status(401).json({ error: 'Access token gerekli' });
    }

    console.log('[AUTH DEBUG] Token doğrulanıyor:', token); // DEBUG LOG
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH DEBUG] Token doğrulandı, decoded:', decoded); // DEBUG LOG
  
    // Not: Token payload şeması farklı olabilir.
    // Yaygın alan adları: userId | sub | id
    const userId = decoded.userId || decoded.sub || decoded.id;
    const role = decoded.role; // Token'dan rolü al

    if (!userId) {
      console.log('[AUTH DEBUG] Geçersiz token payload'); // DEBUG LOG
      return res.status(401).json({ error: 'Geçersiz token payload' });
    }

    // Admin token ise veritabanı sorgusunu atla
    if (role === 'admin') {
      req.user = { id: userId, role: 'admin' };
      console.log('[AUTH DEBUG] Auth başarılı (admin token), user:', req.user);
      next();
      return;
    }
  
    // Kullanıcıyı veritabanından kontrol et (varlık ve durum)
    console.log('[AUTH DEBUG] Kullanıcı aranıyor, userId:', userId); // DEBUG LOG
    const user = await knex('influencers').where('id', userId).first();
    console.log('[AUTH DEBUG] Kullanıcı bulundu:', user); // DEBUG LOG
    if (!user) {
      console.log('[AUTH DEBUG] Kullanıcı bulunamadı'); // DEBUG LOG
      return res.status(401).json({ error: 'Geçersiz token' });
    }

    // Kullanıcı nesnesine rolü ekle (token'dan gelen rolü kullan)
    user.role = role || user.role;
  
    req.user = user;
    console.log('[AUTH DEBUG] Auth başarılı, user:', user); // DEBUG LOG
    next();
  } catch (error) {
    console.log('[AUTH DEBUG] Auth hatası:', error); // DEBUG LOG
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
  console.log('[AUTH DEBUG] requireAdmin middleware çalışıyor, user:', req.user); // DEBUG LOG
  
  // Öncelikle kullanıcı nesnesini kontrol et
  if (!req.user) {
    console.log('[AUTH DEBUG] Kullanıcı oturumu bulunamadı'); // DEBUG LOG
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  
  // Eğer kullanıcı admin değilse hata döndür
  if (req.user.role !== 'admin') {
    console.log('[AUTH DEBUG] Admin yetkisi yok, role:', req.user.role); // DEBUG LOG
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  
  console.log('[AUTH DEBUG] Admin yetkisi onaylandı'); // DEBUG LOG
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