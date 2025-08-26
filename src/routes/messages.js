/**
 * Mesajlaşma Uçları (admin ↔ influencer)
 * Varsayım: Admin ve Influencer kullanıcıları 'influencers' tablosunda role alanı ile tutulur.
 * Kimlik doğrulama: authenticateToken zorunlu. Rol bazlı kısıtlar uçlarda uygulanır.
 *
 * Uçlar:
 * - POST   /messages                 : Mesaj oluştur (influencer→admin veya admin→influencer)
 * - GET    /messages/thread          : İki taraf arasındaki konuşmayı getir
 * - POST   /messages/read            : Karşı taraftan gelen okunmamışları okundu yap
 * - GET    /messages/unread-count    : Okunmamış sayısı (aggregate veya belirli hat)
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Yardımcı: güvenli trim ve string doğrulama
function nonEmptyString(s, min = 1) {
  return typeof s === 'string' && s.trim().length >= min;
}
function now(knex) {
  return knex.fn.now();
}

// Kullanıcının role ve id'sini normalize et
function getActor(req) {
  // auth middleware req.user'ı influencers tablosundan dolduruyor
  const role = req.user?.role || 'influencer';
  const id = req.user?.id; // influencers.id
  return { role, id };
}

// POST /messages
// Influencer: { to: 'admin', body }
// Admin: { to: 'influencer', influencerId, body }
router.post('/messages', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const { to, influencerId, body } = req.body || {};

  if (!nonEmptyString(body, 1)) {
    const err = new Error('Mesaj içeriği (body) zorunludur');
    err.status = 400;
    throw err;
  }

  if (actor.role === 'influencer') {
    // influencer → admin
    if (to !== 'admin') {
      const err = new Error("Influencer yalnızca admin'e mesaj atabilir (to='admin')");
      err.status = 400;
      throw err;
    }

    // Admin hesabı seçimi: İlk admin kaydını hedef al
    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      const err = new Error('Admin hesabı bulunamadı');
      err.status = 500;
      throw err;
    }

    const [id] = await knex('messages').insert({
      from_role: 'influencer',
      from_user_id: actor.id,
      to_role: 'admin',
      to_user_id: admin.id,
      body: String(body).trim(),
      created_at: now(knex),
      read_at: null
    });

    const created = await knex('messages').where({ id }).first();
    return res.status(201).json({ message: 'Mesaj gönderildi', item: created });
  }

  if (actor.role === 'admin') {
    // admin → influencer
    if (to !== 'influencer') {
      const err = new Error("Admin yalnızca influencera mesaj atabilir (to='influencer')");
      err.status = 400;
      throw err;
    }
    const inflId = Number(influencerId);
    if (!inflId || Number.isNaN(inflId)) {
      const err = new Error('Geçerli influencerId zorunludur');
      err.status = 400;
      throw err;
    }
    const influencer = await knex('influencers').where('id', inflId).first();
    if (!influencer) {
      const err = new Error('Influencer bulunamadı');
      err.status = 404;
      throw err;
    }

    const [id] = await knex('messages').insert({
      from_role: 'admin',
      from_user_id: actor.id,
      to_role: 'influencer',
      to_user_id: influencer.id,
      body: String(body).trim(),
      created_at: now(knex),
      read_at: null
    });

    const created = await knex('messages').where({ id }).first();
    return res.status(201).json({ message: 'Mesaj gönderildi', item: created });
  }

  const err = new Error('Bu işlem için yetkiniz yok');
  err.status = 403;
  throw err;
}));

// GET /messages/thread
// Influencer: admin ↔ me tüm mesajlar
// Admin: ?influencerId= zorunlu
// Opsiyonel: ?limit=50&before=timestamp
router.get('/messages/thread', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const before = req.query.before ? new Date(String(req.query.before)) : null;

  let aId, bId; // a ↔ b konuşan taraflar (influencerId, adminId)
  if (actor.role === 'influencer') {
    // kendim (influencer) ↔ ilk admin
    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      const err = new Error('Admin hesabı bulunamadı');
      err.status = 500;
      throw err;
    }
    aId = actor.id;
    bId = admin.id;
  } else if (actor.role === 'admin') {
    const inflId = Number(req.query.influencerId);
    if (!inflId || Number.isNaN(inflId)) {
      const err = new Error('influencerId zorunludur');
      err.status = 400;
      throw err;
    }
    const influencer = await knex('influencers').where('id', inflId).first();
    if (!influencer) {
      const err = new Error('Influencer bulunamadı');
      err.status = 404;
      throw err;
    }
    aId = influencer.id;
    bId = actor.id;
  } else {
    const err = new Error('Bu işlem için yetkiniz yok');
    err.status = 403;
    throw err;
  }

  let q = knex('messages')
    .where(function() {
      this.where({ from_user_id: aId, to_user_id: bId })
        .orWhere({ from_user_id: bId, to_user_id: aId });
    })
    .orderBy('created_at', 'desc')
    .limit(limit);

  if (before && !isNaN(before.getTime())) {
    q = q.andWhere('created_at', '<', before.toISOString());
  }

  const rows = await q;
  return res.json({ items: rows.reverse() }); // kronolojik artan
}));

// POST /messages/read
// Influencer: admin→me gelen okunmamışları okundu yap
// Admin: influencer→admin gelen okunmamışları, influencerId ile okundu yap
router.post('/messages/read', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);

  if (actor.role === 'influencer') {
    // admin → influencer (me) tarafındaki unread'leri okundu yap
    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      const err = new Error('Admin hesabı bulunamadı');
      err.status = 500;
      throw err;
    }
    const affected = await knex('messages')
      .where({
        from_role: 'admin',
        from_user_id: admin.id,
        to_role: 'influencer',
        to_user_id: actor.id
      })
      .whereNull('read_at')
      .update({ read_at: now(knex) });

    return res.json({ updated: affected });
  }

  if (actor.role === 'admin') {
    const inflId = Number(req.body?.influencerId);
    if (!inflId || Number.isNaN(inflId)) {
      const err = new Error('influencerId zorunludur');
      err.status = 400;
      throw err;
    }
    const influencer = await knex('influencers').where('id', inflId).first();
    if (!influencer) {
      const err = new Error('Influencer bulunamadı');
      err.status = 404;
      throw err;
    }

    const affected = await knex('messages')
      .where({
        from_role: 'influencer',
        from_user_id: influencer.id,
        to_role: 'admin',
        to_user_id: actor.id
      })
      .whereNull('read_at')
      .update({ read_at: now(knex) });

    return res.json({ updated: affected });
  }

  const err = new Error('Bu işlem için yetkiniz yok');
  err.status = 403;
  throw err;
}));

// GET /messages/unread-count
// Influencer: admin→me okunmamış sayısı
// Admin: ?influencerId= (spesifik hat) veya ?aggregate=true (tüm influencerlardan gelen toplam)
router.get('/messages/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const aggregate = String(req.query.aggregate || '').toLowerCase() === 'true';
  const inflIdQ = req.query.influencerId ? Number(req.query.influencerId) : null;

  if (actor.role === 'influencer') {
    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      const err = new Error('Admin hesabı bulunamadı');
      err.status = 500;
      throw err;
    }
    const row = await knex('messages')
      .where({
        from_role: 'admin',
        from_user_id: admin.id,
        to_role: 'influencer',
        to_user_id: actor.id
      })
      .whereNull('read_at')
      .count({ c: '*' })
      .first();

    const count = Number(row?.c || row?.count || 0);
    return res.json({ unread: count });
  }

  if (actor.role === 'admin') {
    if (aggregate) {
      // Tüm influencerlardan gelen unread toplamı
      const row = await knex('messages')
        .where({ to_role: 'admin', to_user_id: actor.id, from_role: 'influencer' })
        .whereNull('read_at')
        .count({ c: '*' })
        .first();
      const count = Number(row?.c || row?.count || 0);
      return res.json({ unread: count });
    }

    if (inflIdQ) {
      // Belirli influencer hattı
      const influencer = await knex('influencers').where('id', inflIdQ).first();
      if (!influencer) {
        const err = new Error('Influencer bulunamadı');
        err.status = 404;
        throw err;
      }
      const row = await knex('messages')
        .where({
          from_role: 'influencer',
          from_user_id: influencer.id,
          to_role: 'admin',
          to_user_id: actor.id
        })
        .whereNull('read_at')
        .count({ c: '*' })
        .first();
      const count = Number(row?.c || row?.count || 0);
      return res.json({ unread: count });
    }

    // Eğer spesifik veya aggregate verilmediyse, 400
    const err = new Error('aggregate=true veya influencerId parametresi zorunludur');
    err.status = 400;
    throw err;
  }

  const err = new Error('Bu işlem için yetkiniz yok');
  err.status = 403;
  throw err;
}));

module.exports = router;