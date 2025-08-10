const express = require('express');
const knex = require('../db/sqlite');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin: Create new system alert (sends to all influencers)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Geçerli bir mesaj gerekli' });
    }

    const [id] = await knex('system_alerts').insert({
      message: message.trim(),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    const alert = await knex('system_alerts').where({ id }).first();
    return res.status(201).json(alert);
  } catch (err) {
    console.error('Sistem uyarısı oluşturma hatası:', err);
    return res.status(500).json({ error: 'Sistem uyarısı oluşturulamadı' });
  }
});

// Admin: List all alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    const alerts = await knex('system_alerts')
      .select('id', 'message', 'created_at')
      .orderBy('created_at', 'desc');

    return res.json(alerts);
  } catch (err) {
    console.error('Sistem uyarıları listeleme hatası:', err);
    return res.status(500).json({ error: 'Sistem uyarıları listelenemedi' });
  }
});

// Admin: Delete alert
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) return res.status(400).json({ error: 'Geçersiz uyarı ID' });

    // Delete associated reads first
    await knex('alert_reads').where('alert_id', alertId).del();

    const affected = await knex('system_alerts').where('id', alertId).del();

    if (!affected) {
      return res.status(404).json({ error: 'Uyarı bulunamadı' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Uyarı silme hatası:', err);
    return res.status(500).json({ error: 'Uyarı silinemedi' });
  }
});

// Influencer: Get unread alerts
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    // Get all alerts that haven't been read by this influencer
    const alerts = await knex('system_alerts as a')
      .leftJoin('alert_reads as r', function() {
        this.on('a.id', '=', 'r.alert_id')
          .andOn('r.influencer_id', '=', knex.raw('?', [userId]));
      })
      .whereNull('r.id')
      .select('a.id', 'a.message', 'a.created_at');

    return res.json(alerts);
  } catch (err) {
    console.error('Okunmamış uyarılar getirme hatası:', err);
    return res.status(500).json({ error: 'Okunmamış uyarılar getirilemedi' });
  }
});

// Influencer: Mark alert as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) return res.status(400).json({ error: 'Geçersiz uyarı ID' });

    // Check if alert exists
    const alert = await knex('system_alerts').where({ id: alertId }).first();
    if (!alert) return res.status(404).json({ error: 'Uyarı bulunamadı' });

    // Check if already read
    const existing = await knex('alert_reads')
      .where({ alert_id: alertId, influencer_id: userId })
      .first();
    
    if (existing) {
      return res.json({ message: 'Uyarı zaten okunmuş' });
    }

    // Mark as read
    await knex('alert_reads').insert({
      influencer_id: userId,
      alert_id: alertId,
      read_at: knex.fn.now()
    });

    return res.json({ message: 'Uyarı okundu olarak işaretlendi' });
  } catch (err) {
    console.error('Uyarı okundu işaretleme hatası:', err);
    return res.status(500).json({ error: 'Uyarı okundu olarak işaretlenemedi' });
  }
});

module.exports = router;