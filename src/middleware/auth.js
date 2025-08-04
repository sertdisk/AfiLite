// JWT Authentication middleware
const jwt = require('jsonwebtoken');
const knex = require('../db/sqlite');

// JWT Secret key - Production'da environment variable olmalı
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Token doğrulama middleware'i
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token gerekli' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Kullanıcıyı veritabanından kontrol et
    const user = await knex('influencers').where('id', decoded.userId).first();
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

// Admin yetkisi kontrolü
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

// Influencer yetkisi kontrolü
const requireInfluencer = (req, res, next) => {
  if (!req.user || req.user.role !== 'influencer') {
    return res.status(403).json({ error: 'Influencer yetkisi gerekli' });
  }
  next();
};

// Kendi kaynaklarına erişim kontrolü
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
        // Influencer'ın kendi kaynaklarına erişim kontrolü
        if (resourceParam === 'influencer_id') {
          const resourceIdNum = typeof resourceId === 'string' ? parseInt(resourceId, 10) : resourceId;
          if (resourceIdNum !== req.user.id) {
            return res.status(403).json({ error: 'Bu kaynağa erişim yetkiniz yok' });
          }
        }
        
        // Discount code kontrolü
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