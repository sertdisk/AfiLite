/*
  Bu dosya: Kimlik doğrulama uçları (admin ve influencer login, token doğrulama, kurulum).
  Güvenlik: Access token süresi 15 dakika; bcrypt cost sabit 11.
  Ek: Girdi doğrulama (Türkçe hata mesajları) ve merkezi hata yakalama kullanılır.
*/
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');
const { validateAuthLogin } = require('../middleware/validation');

// Şifreleme ve token ömrü sabitleri (sertleştirme)
const BCRYPT_SALT_ROUNDS = 11; // bcrypt cost=11
const ACCESS_TOKEN_TTL = '15m'; // access token 15 dakika

// Admin login endpoint (kimlik doğrulama)
router.post('/api/v1/login', validateAuthLogin, asyncHandler(async (req, res, next) => {
  // UI uyumluluğu için alias: gerçek handlera delege et
  req.url = '/login';
  next();
}));

router.post('/login', validateAuthLogin, asyncHandler(async (req, res) => {
const { email, password } = req.body;

// Şema uyumsuzluğu ihtimaline karşı: role kolonunun olmayabileceği senaryoda sadece email'e göre bak
let query = knex('influencers').where('email', email);
try {
  const hasRole = await knex('influencers').columnInfo().then(ci => !!ci.role);
  if (hasRole) query = query.where('role', 'admin');
} catch {}

const user = await query.first();

if (!user) {
  const err = new Error('Geçersiz email veya şifre');
  err.status = 401;
  throw err;
}

// Parola doğrulama: password_hash yoksa dev kolaylığı olarak kabul et
let isValidPassword = false;
if (user.password_hash) {
  try { isValidPassword = await bcrypt.compare(password, user.password_hash); } catch { isValidPassword = false; }
} else {
  isValidPassword = true;
}

if (!isValidPassword) {
  const err = new Error('Geçersiz email veya şifre');
  err.status = 401;
  throw err;
}

const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role || 'influencer' },
  JWT_SECRET,
  { expiresIn: ACCESS_TOKEN_TTL }
);

// Token'ı cookie'ye yaz
res.cookie('jwt_influencer', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000 // 15 dakika
}).json({
  message: 'Giriş başarılı',
  token,
  user: {
    id: user.id,
    email: user.email,
    role: user.role || 'influencer'
  }
});
}));

// Influencer login endpoint (onaylanmış influencer'lar için, kimlik doğrulama)
// Geçici geliştirme modu: Eğer password_hash kolonu yoksa veya parola boşsa, sadece email ve approved durumu ile girişe izin ver.
router.post('/api/v1/influencer/login', validateAuthLogin, asyncHandler(async (req, res, next) => {
  // UI uyumluluğu için alias: gerçek handlera delege et
  req.url = '/influencer/login';
  next();
}));

router.post('/influencer/login', validateAuthLogin, asyncHandler(async (req, res) => {
const { email, password } = req.body;

const influencer = await knex('influencers')
  .where('email', email)
  .first();

if (!influencer || influencer.status !== 'approved') {
  const err = new Error('Onaylanmış influencer bulunamadı');
  err.status = 401;
  throw err;
}

// Parola doğrulama: tablo şemasında password_hash olmayabilir
  console.log('Influencer email:', influencer.email);
  console.log('Provided password:', password);
  console.log('Stored password hash:', influencer.password_hash);
let passwordOk = false;
if (influencer.password_hash) {
  try {
    passwordOk = await bcrypt.compare(password, influencer.password_hash);
  } catch (e) {
    console.error('Bcrypt compare error:', e);
    passwordOk = false;
  }
} else {
  // Geliştirme kolaylığı: parola alanı yoksa email eşleşmesi yeterlidir
  passwordOk = true;
}

if (!passwordOk) {
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

// Token'ı cookie'ye yaz
res.cookie('jwt_influencer', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000 // 15 dakika
}).json({
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

 // Zorunlu alanlar için varsayılan değerler
 const now = new Date();
 const adminData = {
   email,
   password_hash: passwordHash,
   role: 'admin',
   full_name: 'Admin User',
   tax_type: 'individual',
   phone: '0000000000',
   iban: 'TR000000000000000000000000',
   social_media: null,
   about: null,
   status: 'approved', // Admin hemen onaylı
   followers: 0,
   created_at: now,
   updated_at: now
 };

 const [userId] = await knex('influencers').insert(adminData);

 res.status(201).json({
   message: 'Admin kullanıcı başarıyla oluşturuldu',
   user_id: userId
 });
}));

// Şifre sıfırlama isteği
// Şifre sıfırlama isteği
router.post('/api/auth/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gerekli' });
  }

  const user = await knex('influencers').where('email', email).first();

  if (!user) {
    // Güvenlik nedeniyle, e-posta adresi bulunsa bile aynı mesajı döndür
    return res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });
  }

  // Token oluşturma (basit bir UUID veya kriptografik olarak güvenli bir string)
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 saat geçerli

  await knex('influencers')
    .where('id', user.id)
    .update({
      reset_token: resetToken,
      reset_token_expires_at: resetTokenExpiresAt,
      updated_at: knex.fn.now()
    });

  // TODO: Şifre sıfırlama linkini içeren e-postayı gönder
  // Örnek: `http://localhost:4000/reset-password?token=${resetToken}`
  console.log(`Şifre sıfırlama linki: http://localhost:4000/reset-password?token=${resetToken}`);

  res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });
}));

// Şifre sıfırlama (yeni şifre belirleme)
router.post('/api/auth/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
  }

  const user = await knex('influencers')
    .where('reset_token', token)
    .where('reset_token_expires_at', '>', knex.fn.now())
    .first();

  if (!user) {
    return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }

  if (newPassword.length < 6) { // Basit şifre uzunluğu kontrolü
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await knex('influencers')
    .where('id', user.id)
    .update({
      password_hash: passwordHash,
      reset_token: null, // Token'ı geçersiz kıl
      reset_token_expires_at: null,
      updated_at: knex.fn.now()
    });

  res.json({ message: 'Şifreniz başarıyla sıfırlandı.' });
}));

module.exports = router;