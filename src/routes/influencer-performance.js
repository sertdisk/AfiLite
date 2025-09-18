const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');
const { authenticateToken } = require('../middleware/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  const influencerId = req.user.userId;
  const { code, start_date, end_date } = req.query;

  try {
    const codesQuery = db('discount_codes').where('influencer_id', influencerId);
    if (code) {
      codesQuery.where('code', code);
    }
    const codes = await codesQuery.select('code');
    const codeStrings = codes.map(c => c.code);

    if (codeStrings.length === 0) {
      return res.json({ labels: [], salesCountData: [], commissionData: [] });
    }

    const salesQuery = db('sales')
      .whereIn('code', codeStrings)
      .select(
        'recorded_at as date',
        'commission'
      )
      .orderBy('date', 'asc');

    if (start_date) {
      salesQuery.where('recorded_at', '>=', start_date);
    }
    if (end_date) {
      salesQuery.where('recorded_at', '<=', end_date);
    }

    const sales = await salesQuery;

    const salesByDay = sales.reduce((acc, sale) => {
      const date = new Date(sale.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { salesCount: 0, totalCommission: 0 };
      }
      acc[date].salesCount += 1;
      acc[date].totalCommission += sale.commission;
      return acc;
    }, {});

    const labels = Object.keys(salesByDay).sort();
    const salesCountData = labels.map(label => salesByDay[label].salesCount);
    const commissionData = labels.map(label => salesByDay[label].totalCommission);

    res.json({
      labels,
      datasets: [
        {
          label: 'Günlük Satış Adedi',
          data: salesCountData,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
        },
        {
          label: 'Günlük Komisyon (TL)',
          data: commissionData,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
        }
      ]
    });
  } catch (error) {
    console.error('Performans istatistikleri alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
