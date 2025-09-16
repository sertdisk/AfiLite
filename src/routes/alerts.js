const express = require('express');
const knex = require('../db/sqlite');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin: Create new system alert (sends to all or selected influencers)
router.post('/', authenticateToken, async (req, res) => {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }

  const { message, target_influencer_ids } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Geçerli bir mesaj gerekli' });
  }

  let trx;
  try {
    trx = await knex.transaction();

    const [alertId] = await trx('system_alerts').insert({
      message: message.trim(),
      target_influencer_ids: target_influencer_ids && target_influencer_ids.length > 0 ? JSON.stringify(target_influencer_ids) : null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });

    let recipientIds = [];
    if (target_influencer_ids && target_influencer_ids.length > 0) {
      recipientIds = target_influencer_ids;
    } else {
      // Send to all if no specific influencers are targeted
      const allInfluencers = await trx('influencers').where('status', 'approved').select('id');
      recipientIds = allInfluencers.map(inf => inf.id);
    }

    if (recipientIds.length > 0) {
      const recipients = recipientIds.map(infId => ({
        alert_id: alertId,
        influencer_id: infId,
      }));
      await trx('alert_recipients').insert(recipients);
    }

    await trx.commit();

    const alert = await knex('system_alerts').where({ id: alertId }).first();
    return res.status(201).json(alert);

  } catch (err) {
    if (trx) {
      await trx.rollback();
    }
    console.error('Sistem uyarısı oluşturma hatası:', err);
    return res.status(500).json({ error: 'Sistem uyarısı oluşturulamadı' });
  }
});

// Admin: List all alerts
router.get('/', authenticateToken, async(req, res) => {
  try {
    const user = req.user
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' })
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const alertsQuery = knex('system_alerts')
      .select('id', 'message', 'created_at', 'target_influencer_ids')
      .orderBy(knex.raw('datetime(created_at)'), 'desc')
      .limit(limit)
      .offset(offset);

    const totalQuery = knex('system_alerts').count('id as count').first();

    const [alerts, totalResult] = await Promise.all([alertsQuery, totalQuery]);
    const total = totalResult.count;

    return res.json({
        items: alerts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
  } catch (err) {
    console.error('Sistem uyarıları listeleme hatası:', err)
    return res.status(500).json({ error: 'Sistem uyarıları listelenemedi' })
  }
})

// Admin: Delete alert
router.delete('/:id', authenticateToken, async(req, res) => {
  try {
    const user = req.user
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' })
    }

    const alertId = parseInt(req.params.id)
    if (isNaN(alertId)) return res.status(400).json({ error: 'Geçersiz uyarı ID' })

    // Use a transaction to ensure all related data is deleted
    await knex.transaction(async(trx) => {
      await trx('alert_reads').where('alert_id', alertId).del()
      await trx('alert_recipients').where('alert_id', alertId).del()
      const affected = await trx('system_alerts').where('id', alertId).del()
      if (!affected) {
        throw new Error('Uyarı bulunamadı')
      }
    })

    return res.status(204).send()
  } catch (err) {
    console.error('Uyarı silme hatası:', err)
    if (err.message === 'Uyarı bulunamadı') {
      return res.status(404).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Uyarı silinemedi' })
  }
})

// Influencer: Get unread alerts
router.get('/unread', authenticateToken, async(req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' })

    // Get all alerts sent to this influencer that they haven't read yet.
    const alerts = await knex('system_alerts as sa')
      .join('alert_recipients as ar', 'sa.id', 'ar.alert_id')
      .leftJoin('alert_reads as ar_read', function() {
        this.on('ar.alert_id', '=', 'ar_read.alert_id')
          .andOn('ar.influencer_id', '=', 'ar_read.influencer_id')
      })
      .where('ar.influencer_id', userId)
      .whereNull('ar_read.id')
      .select('sa.id', 'sa.message', 'sa.created_at')

    return res.json(alerts)
  } catch (err) {
    console.error('Okunmamış uyarılar getirme hatası:', err)
    return res.status(500).json({ error: 'Okunmamış uyarılar getirilemedi' })
  }
})

// Influencer: Mark alert as read
router.post('/:id/read', authenticateToken, async(req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' })

    const alertId = parseInt(req.params.id)
    if (isNaN(alertId)) return res.status(400).json({ error: 'Geçersiz uyarı ID' })

    // Check if the user was a recipient of this alert
    const recipient = await knex('alert_recipients').where({ alert_id: alertId, influencer_id: userId }).first()
    if (!recipient) {
      return res.status(404).json({ error: 'Bu uyarı size gönderilmemiş veya mevcut değil.' })
    }

    // Check if already read
    const existing = await knex('alert_reads')
      .where({ alert_id: alertId, influencer_id: userId })
      .first()

    if (existing) {
      return res.json({ message: 'Uyarı zaten okunmuş' })
    }

    // Mark as read
    await knex('alert_reads').insert({
      influencer_id: userId,
      alert_id: alertId,
      read_at: knex.fn.now()
    })

    return res.json({ message: 'Uyarı okundu olarak işaretlendi' })
  } catch (err) {
    console.error('Uyarı okundu işaretleme hatası:', err)
    return res.status(500).json({ error: 'Uyarı okundu olarak işaretlenemedi' })
  }
})

module.exports = router
