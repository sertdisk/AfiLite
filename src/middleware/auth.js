/*
  Bu dosya: Kimlik doğrulama ve yetkilendirme yardımcıları.
  Amaç: JWT doğrulama, rol kontrolleri ve kaynak erişim yetkisi.
*/
const jwt = require('jsonwebtoken')
const knex = require('../db/sqlite')

// Token doğrulama middleware'i (erişim kontrolü)
  const authenticateToken = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1] // Bearer Token

  if (!token) {
    token = req.cookies.jwt_admin || req.cookies.jwt_influencer
    if (!token) {
      // Cookie'den manuel olarak token çekme (Next.js proxy sorunları için)
      const rawCookieHeader = req.headers.cookie
      if (rawCookieHeader) {
        const cookies = rawCookieHeader.split(';').map(c => c.trim())
        const adminCookie = cookies.find(c => c.startsWith('jwt_admin='))
        const influencerCookie = cookies.find(c => c.startsWith('jwt_influencer='))
        if (adminCookie) {
          token = adminCookie.substring('jwt_admin='.length)
        } else if (influencerCookie) {
          token = influencerCookie.substring('jwt_influencer='.length)
        }
      }
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Erişim reddedildi. Token bulunamadı.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ error: 'Geçersiz token payload.' })
    }

    const userId = decoded.userId
    const role = decoded.role

    const user = await knex('influencers').where({ id: userId, role: role }).first()

    if (!user) {
      return res.status(401).json({ error: 'Token\'a karşılık gelen kullanıcı bulunamadı.' })
    }

    req.user = { userId: user.id, role: user.role, email: user.email }
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Geçersiz token.' })
  }
}

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Yönetici yetkisi gerekli.' })
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Yönetici yetkisi gerekli.' })
  }
  next()
}


// Admin yetkisi kontrolü (rol kontrol)


// Influencer yetkisi kontrolü (rol kontrol)
const requireInfluencer = (req, res, next) => {
  if (!req.user || req.user.role !== 'influencer') {
    return res.status(403).json({ error: 'Influencer yetkisi gerekli' })
  }
  next()
}

// Kendi kaynaklarına erişim kontrolü (sahiplik doğrulama)
const authorizeResourceAccess = (resourceParam) => {
  return async(req, res, next) => {
    try {
      const resourceId = req.params[resourceParam]

      if (!resourceId) {
        return res.status(400).json({ error: 'Kaynak ID gerekli' })
      }

      // Admin kullanıcılar her şeye erişebilir
      if (req.user.role === 'admin') {
        return next()
      }

      // Influencer kullanıcılar sadece kendi kaynaklarına erişebilir
      if (req.user.role === 'influencer') {
        // Influencer'ın kendi kaynağı
        if (resourceParam === 'influencer_id') {
          const resourceIdNum = typeof resourceId === 'string' ? parseInt(resourceId, 10) : resourceId
          if (resourceIdNum !== req.user.id) {
            return res.status(403).json({ error: 'Bu kaynağa erişim yetkiniz yok' })
          }
        }

        // Discount code sahiplik kontrolü
        if (resourceParam === 'code_id') {
          const code = await knex('discount_codes')
            .where('id', resourceId)
            .where('influencer_id', req.user.id)
            .first()

          if (!code) {
            return res.status(403).json({ error: 'Bu koda erişim yetkiniz yok' })
          }
        }
      }

      next()
    } catch (error) {
      res.status(500).json({ error: 'Yetki kontrolü hatası' })
    }
  }
}

// API key authentication (admin için)
const authenticateApiKey = async(req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key']

    if (!apiKey) {
      return res.status(401).json({ error: 'API key gerekli' })
    }

    const user = await knex('influencers')
      .where('api_key', apiKey)
      .where('role', 'admin')
      .first()

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz API key' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(500).json({ error: 'API key doğrulama hatası' })
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInfluencer,
  authorizeResourceAccess,
  authenticateApiKey
}