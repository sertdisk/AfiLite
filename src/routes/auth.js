const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// Admin login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gerekli' });
  }

  // Admin kullanıcıyı bul
  const user = await knex('influencers')
    .where('email', email)
    .where('role', 'admin')
    .first();

  if (!user) {
    return res.status(401).json({ error: 'Geçersiz email veya şifre' });
  }

  // Şifre kontrolü
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Geçersiz email veya şifre' });
  }

  // JWT token oluştur
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Giriş başarılı',
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
}));

// Influencer login endpoint (onaylanmış influencer'lar için)
router.post('/influencer/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gerekli' });
  }

  // Onaylanmış influencer'ı bul
  const influencer = await knex('influencers')
    .where('email', email)
    .where('status', 'approved')
    .first();

  if (!influencer) {
    return res.status(401).json({ error: 'Onaylanmış influencer bulunamadı' });
  }

  // Şifre kontrolü
  const isValidPassword = await bcrypt.compare(password, influencer.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Geçersiz email veya şifre' });
  }

  // JWT token oluştur
  const token = jwt.sign(
    {
      userId: influencer.id,
      email: influencer.email,
      role: 'influencer'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Influencer girişi başarılı',
    token,
    user: {
      id: influencer.id,
      email: influencer.email,
      role: 'influencer',
      full_name: influencer.full_name
    }
  });
}));

// Token doğrulama endpoint
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
}));

// Admin kullanıcı oluşturma (ilk kurulum için)
router.post('/setup-admin', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gerekli' });
  }

  // Admin zaten var mı kontrol et
  const existingAdmin = await knex('influencers')
    .where('role', 'admin')
    .first();

  if (existingAdmin) {
    return res.status(409).json({ error: 'Admin kullanıcı zaten mevcut' });
  }

  // Şifreyi hashle
  const passwordHash = await bcrypt.hash(password, 10);

  // Admin kullanıcı oluştur
  const [userId] = await knex('influencers').insert({
    email,
    password_hash: passwordHash,
    role: 'admin',
    created_at: new Date()
  });

  res.status(201).json({
    message: 'Admin kullanıcı başarıyla oluşturuldu',
    user_id: userId
  });
}));

module.exports = router;