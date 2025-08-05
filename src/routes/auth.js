/*
  Bu dosya: Kimlik doğrulama uçları (admin ve influencer login, token doğrulama, kurulum).
  Güvenlik: Access token süresi 15 dakika; bcrypt cost sabit 11.
  Ek: Girdi doğrulama (Türkçe hata mesajları) ve merkezi hata yakalama kullanılır.
*/
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');
const { validateAuthLogin } = require('../middleware/validation');

// Şifreleme ve token ömrü sabitleri (sertleştirme)
const BCRYPT_SALT_ROUNDS = 11; // bcrypt cost=11
const ACCESS_TOKEN_TTL = '15m'; // access token 15 dakika

// Admin login endpoint (kimlik doğrulama)
router.post('/login', validateAuthLogin, asyncHandler(async (req, res) => {
 const { email, password } = req.body;

 const user = await knex('influencers')
   .where('email', email)
   .where('role', 'admin')
   .first();

 if (!user) {
   const err = new Error('Geçersiz email veya şifre');
   err.status = 401;
   throw err;
 }

 const isValidPassword = await bcrypt.compare(password, user.password_hash);
 if (!isValidPassword) {
   const err = new Error('Geçersiz email veya şifre');
   err.status = 401;
   throw err;
 }

 const token = jwt.sign(
   { userId: user.id, email: user.email, role: user.role },
   JWT_SECRET,
   { expiresIn: ACCESS_TOKEN_TTL }
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

// Influencer login endpoint (onaylanmış influencer'lar için, kimlik doğrulama)
router.post('/influencer/login', validateAuthLogin, asyncHandler(async (req, res) => {
 const { email, password } = req.body;

 const influencer = await knex('influencers')
   .where('email', email)
   .where('status', 'approved')
   .first();

 if (!influencer) {
   const err = new Error('Onaylanmış influencer bulunamadı');
   err.status = 401;
   throw err;
 }

 const isValidPassword = await bcrypt.compare(password, influencer.password_hash);
 if (!isValidPassword) {
   const err = new Error('Geçersiz email veya şifre');
   err.status = 401;
   throw err;
 }

 const token = jwt.sign(
   {
     userId: influencer.id,
     email: influencer.email,
     role: 'influencer'
   },
   JWT_SECRET,
   { expiresIn: ACCESS_TOKEN_TTL }
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

// Token doğrulama endpoint (geçerlilik kontrolü)
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

// Admin kullanıcı oluşturma (ilk kurulum için, bcrypt cost=11)
router.post('/setup-admin', validateAuthLogin, asyncHandler(async (req, res) => {
 const { email, password } = req.body;

 const existingAdmin = await knex('influencers')
   .where('role', 'admin')
   .first();

 if (existingAdmin) {
   const err = new Error('Admin kullanıcı zaten mevcut');
   err.status = 409;
   throw err;
 }

 const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

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