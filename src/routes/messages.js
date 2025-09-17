const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

function getActor(req) {
  const role = req.user?.role || 'influencer';
  const id = req.user?.userId;
  return { role, id };
}

// POST /messages (Birebir Mesaj Gönderme)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const { to, influencerId, body } = req.body || {};

  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Mesaj içeriği zorunludur' });
  }

  // Admin veya influencer mesaj gönderebilir
  if (actor.role !== 'admin' && actor.role !== 'influencer') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  let from_role, from_user_id, to_role, to_user_id;

  if (actor.role === 'admin') {
    // Admin influencer'a mesaj gönderiyor
    const inflId = Number(influencerId);
    if (!inflId) {
      return res.status(400).json({ error: 'Geçerli influencerId zorunludur' });
    }

    const influencer = await knex('influencers').where('id', inflId).first();
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer bulunamadı' });
    }

    from_role = 'admin';
    from_user_id = actor.id;
    to_role = 'influencer';
    to_user_id = influencer.id;
  } else {
    // Influencer admin'e mesaj gönderiyor
    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      return res.status(404).json({ error: 'Admin kullanıcısı bulunamadı' });
    }

    from_role = 'influencer';
    from_user_id = actor.id;
    to_role = 'admin';
    to_user_id = admin.id;
  }

  const [id] = await knex('messages').insert({
    from_role,
    from_user_id,
    to_role,
    to_user_id,
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

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let messagesQuery = knex('messages')
        .where(function() {
            this.where({ from_user_id: actor.id, to_user_id: inflId })
                .orWhere({ from_user_id: inflId, to_user_id: actor.id });
        })
        .orderBy(knex.raw('datetime(created_at)'), 'desc') // Order by desc for infinite scroll
        .limit(limit)
        .offset(offset);
    
    let countQuery = knex('messages')
        .where(function() {
            this.where({ from_user_id: actor.id, to_user_id: inflId })
                .orWhere({ from_user_id: inflId, to_user_id: actor.id });
        });

    const [messages, totalResult] = await Promise.all([
        messagesQuery,
        countQuery.count('* as count').first()
    ]);

    const total = totalResult.count;

    res.json({
        items: messages.reverse(), // Reverse for chronological order on frontend
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// GET /messages/my-thread (Influencer'ın Kendi Konuşma Geçmişi)
router.get('/my-thread', authenticateToken, asyncHandler(async (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'influencer') return res.status(403).json({ error: 'Yetki gerekli' });

    const influencerId = actor.id; // Influencer'ın kendi ID'si
    const adminId = await knex('influencers').where('role', 'admin').select('id').first(); // İlk admin'in ID'si

    if (!adminId) {
        return res.status(404).json({ error: 'Admin kullanıcısı bulunamadı' });
    }

    const messages = await knex('messages')
        .where(function() {
            this.where({ from_user_id: influencerId, to_user_id: adminId.id })
                .orWhere({ from_user_id: adminId.id, to_user_id: influencerId });
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

// POST /messages/my/read (Influencer'ın kendi mesajlarını okundu olarak işaretlemesi)
router.post('/my/read', authenticateToken, asyncHandler(async (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'influencer') return res.status(403).json({ error: 'Yetki gerekli' });

    const admin = await knex('influencers').where('role', 'admin').first();
    if (!admin) {
      return res.status(404).json({ error: 'Admin kullanıcısı bulunamadı' });
    }

    const affected = await knex('messages')
        .where({ from_user_id: admin.id, to_user_id: actor.id })
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
  const { filter, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Subquery to get the last message for each conversation
  const lastMessageSubquery = knex('messages')
    .select('*', knex.raw('ROW_NUMBER() OVER(PARTITION BY CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END ORDER BY created_at DESC) as rn', [adminId]))
    .where('from_user_id', adminId)
    .orWhere('to_user_id', adminId)
    .as('last_messages');

  // Main query
  let query = knex.from(function() {
    this.from(lastMessageSubquery).where('rn', 1).as('lm');
  })
  .join('influencers as i', 'i.id', knex.raw('CASE WHEN lm.from_user_id = ? THEN lm.to_user_id ELSE lm.from_user_id END', [adminId]))
  .leftJoin(knex.raw(`(
    SELECT from_user_id, COUNT(*) as unread_count
    FROM messages
    WHERE to_user_id = ? AND read_at IS NULL
    GROUP BY from_user_id
  ) as unread_counts ON unread_counts.from_user_id = i.id`, [adminId]))
  .select(
    'i.id as influencerId',
    'i.full_name as influencerName',
    'i.email as influencerEmail',
    'lm.body as lastMessage',
    'lm.created_at as lastMessageAt',
    'lm.from_role as lastMessageFromRole',
    knex.raw('COALESCE(unread_counts.unread_count, 0) as unreadCount')
  );

  // Apply filtering
  if (filter) {
    query.where(function() {
      if (filter === 'unread') {
        this.where('unread_counts.unread_count', '>', 0);
      } else if (filter === 'sent') {
        this.where('lm.from_role', 'admin');
      } else if (filter === 'incoming') {
        this.where('lm.from_role', 'influencer');
      }
    });
  }

  // Get total count
  const totalQuery = query.clone().count('* as count').first();

  // Apply ordering and pagination
  query.orderBy('lastMessageAt', 'desc').limit(limit).offset(offset);

  const [threads, totalResult] = await Promise.all([query, totalQuery]);

  const formattedThreads = threads.map(t => ({
    ...t,
    isAdminSender: t.lastMessageFromRole === 'admin',
  }));

  res.json({
    items: formattedThreads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalResult.count,
      pages: Math.ceil(totalResult.count / limit)
    }
  });
}));

// GET /messages/unread-count (Influencer için okunmamış mesaj sayısı)
router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const actor = getActor(req);
  if (actor.role !== 'influencer') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }
  
 const influencerId = actor.id;
  
  // Sadece development ortamında debug loglarını göster
  if (process.env.NODE_ENV === 'development') {
    console.log('Fetching unread count for influencerId:', influencerId);
  }

  // Admin'den gelen ve okunmamış mesajları say
  const messagesQuery = knex('messages')
    .where('from_role', 'admin')
    .whereRaw('to_user_id = ?', [influencerId])
    .whereNull('read_at');
    
  // Sadece development ortamında SQL query loglarını göster
  if (process.env.NODE_ENV === 'development') {
    console.log('Messages query SQL:', messagesQuery.toString());
  }
  
  const messages = await messagesQuery;
  const unreadCount = messages.length;
  
  // Sadece development ortamında sonuç loglarını göster
  if (process.env.NODE_ENV === 'development') {
    console.log('Unread count:', unreadCount);
  }
  
  res.json({ unread: unreadCount });
}));

module.exports = router;