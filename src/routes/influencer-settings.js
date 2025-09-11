const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Helper to resolve user ID from request
function resolveUserId(req) {
  return (req.user && (req.user.userId || req.user.user_id || req.user.id)) || null;
}

// GET /influencer/social-accounts
router.get('/social-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

  const socialAccounts = await knex('influencer_social_accounts')
    .where('influencer_id', userId)
    .select('id', 'platform', 'username', 'url', 'followers', 'is_active', 'created_at');

  res.json({ items: socialAccounts });
}));

// GET /influencer/payment-accounts
router.get('/payment-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

  const paymentAccounts = await knex('influencer_payment_accounts')
    .where('influencer_id', userId)
    .select('id', 'bank_name', 'iban', 'account_holder_name', 'is_active', 'created_at');

  res.json({ items: paymentAccounts });
}));

// PATCH /influencer/me
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

  const { full_name, email, brand_name, phone, about } = req.body;

  const updatePayload = {};
  if (full_name !== undefined) updatePayload.full_name = full_name;
  if (email !== undefined) updatePayload.email = email;
  if (brand_name !== undefined) updatePayload.brand_name = brand_name;
  if (phone !== undefined) updatePayload.phone = phone;
  if (about !== undefined) updatePayload.about = about;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ error: 'Güncellenecek veri bulunamadı.' });
  }

  await knex('influencers').where('id', userId).update(updatePayload);

  const updatedInfluencer = await knex('influencers').where('id', userId).first();
  res.json(updatedInfluencer);
}));

// PATCH /influencer/me/password
router.patch('/me/password', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Mevcut ve yeni şifre gerekli.' });
  }

  const influencer = await knex('influencers').where('id', userId).first();
  if (!influencer) {
    return res.status(404).json({ error: 'Influencer bulunamadı.' });
  }

  const isMatch = await bcrypt.compare(oldPassword, influencer.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Mevcut şifre yanlış.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 11); // Use bcrypt salt rounds from auth.js
  await knex('influencers').where('id', userId).update({ password_hash: hashedPassword });

  res.json({ message: 'Şifre başarıyla güncellendi.' });
}));

// POST /influencer/social-accounts
router.post('/social-accounts', authenticateToken, asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

  const { platform, username, url, followers } = req.body;

  if (!platform || !username || !url) {
    return res.status(400).json({ error: 'Platform, kullanıcı adı ve URL zorunludur.' });
  }

  const [id] = await knex('influencer_social_accounts').insert({
    influencer_id: userId,
    platform,
    username,
    url,
    followers: followers || 0,
    is_active: true,
    created_at: knex.fn.now(),
  });

  const newAccount = await knex('influencer_social_accounts').where({ id }).first();
  res.status(201).json({ message: 'Sosyal medya hesabı eklendi.', account: newAccount });
}));

module.exports = router;
