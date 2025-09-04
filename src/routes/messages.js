const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

function getActor(req) {
  const role = req.user?.role || 'influencer';
  const id = req.user?.id;
  return { role, id };
}

// POST /messages (Birebir Mesaj Gönderme)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const { to, influencerId, body } = req.body || {};

  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Mesaj içeriği zorunludur' });
  }

  if (actor.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için sadece admin yetkilidir' });
  }

  const inflId = Number(influencerId);
  if (!inflId) {
    return res.status(400).json({ error: 'Geçerli influencerId zorunludur' });
  }

  const influencer = await knex('influencers').where('id', inflId).first();
  if (!influencer) {
    return res.status(404).json({ error: 'Influencer bulunamadı' });
  }

  const [id] = await knex('messages').insert({
    from_role: 'admin',
    from_user_id: actor.id,
    to_role: 'influencer',
    to_user_id: influencer.id,
    body: body.trim(),
    created_at: knex.fn.now(),
  });

  const created = await knex('messages').where({ id }).first();
  res.status(201).json({ message: 'Mesaj gönderildi', item: created });
}));

// GET /messages/thread (Konuşma Geçmişi)
router.get('/thread', authenticateToken, asyncHandler(async (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'admin') return res.status(403).json({ error: 'Yetki gerekli' });

    const inflId = Number(req.query.influencerId);
    if (!inflId) return res.status(400).json({ error: 'influencerId zorunludur' });

    const messages = await knex('messages')
        .where(function() {
            this.where({ from_user_id: actor.id, to_user_id: inflId })
                .orWhere({ from_user_id: inflId, to_user_id: actor.id });
        })
        .orderBy('created_at', 'asc');
    
    res.json({ items: messages });
}));

// POST /messages/read (Okundu Olarak İşaretleme)
router.post('/read', authenticateToken, asyncHandler(async (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'admin') return res.status(403).json({ error: 'Yetki gerekli' });

    const { influencerId } = req.body;
    if (!influencerId) return res.status(400).json({ error: 'influencerId zorunludur' });

    const affected = await knex('messages')
        .where({ from_user_id: influencerId, to_user_id: actor.id })
        .whereNull('read_at')
        .update({ read_at: knex.fn.now() });

    res.json({ updated: affected });
}));

// POST /messages/bulk (Toplu Mesaj Gönderme)
router.post('/bulk', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  if (actor.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const { body, influencerIds } = req.body;

  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Mesaj içeriği zorunludur' });
  }

  let recipientIds = [];
  if (!influencerIds || influencerIds.length === 0) {
    // ID listesi boşsa, tüm aktif influencer'lara gönder
    const allInfluencers = await knex('influencers').where('status', 'approved').select('id');
    recipientIds = allInfluencers.map(inf => inf.id);
  } else {
    recipientIds = influencerIds;
  }

  if (recipientIds.length === 0) {
      return res.status(400).json({ error: 'Gönderilecek influencer bulunamadı.' });
  }

  const messagesToInsert = recipientIds.map(infId => ({
    from_role: 'admin',
    from_user_id: actor.id,
    to_role: 'influencer',
    to_user_id: infId,
    body: body.trim(),
    created_at: knex.fn.now(),
  }));

  await knex('messages').insert(messagesToInsert);

  res.status(201).json({ message: `${recipientIds.length} kullanıcıya mesaj gönderildi.` });
}));

// GET /admin-threads-summary (Admin için Konuşma Özetleri)
router.get('/admin-threads-summary', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  if (actor.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const adminId = actor.id;
  const { filter } = req.query;

  // 1. Admin ile konuşması olan tüm influencer'ların ID'lerini bul
  const involvedMessages = await knex('messages')
    .where('from_user_id', adminId)
    .orWhere('to_user_id', adminId);

  const influencerIds = [...new Set(
    involvedMessages.map(m => m.from_user_id === adminId ? m.to_user_id : m.from_user_id)
  )];

  let threads = [];

  // 2. Her bir influencer için özet oluştur
  for (const influencerId of influencerIds) {
    const influencer = await knex('influencers').where({ id: influencerId }).first();
    if (!influencer || influencer.role !== 'influencer') continue;

    const lastMessage = await knex('messages')
      .where(function() {
        this.where({ from_user_id: adminId, to_user_id: influencerId })
          .orWhere({ from_user_id: influencerId, to_user_id: adminId });
      })
      .orderBy('created_at', 'desc')
      .first();

    if (!lastMessage) continue;

    const unreadCount = await knex('messages')
      .where({ from_user_id: influencerId, to_user_id: adminId, read_at: null })
      .count({ count: '*' })
      .first();

    threads.push({
      influencerId: influencer.id,
      influencerName: influencer.name,
      influencerEmail: influencer.email,
      lastMessage: lastMessage.body,
      lastMessageAt: lastMessage.created_at,
      isAdminSender: lastMessage.from_role === 'admin',
      unreadCount: Number(unreadCount.count),
    });
  }

  // 3. Filtrelemeyi uygula
  if (filter) {
    threads = threads.filter(t => {
      if (filter === 'unread') return t.unreadCount > 0;
      if (filter === 'sent') return t.isAdminSender;
      if (filter === 'incoming') return !t.isAdminSender;
      return true; // 'all' için
    });
  }

  // 4. Sonuca göre sırala
  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  res.json({ items: threads });
}));

module.exports = router;