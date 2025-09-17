const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');
const { authenticateToken } = require('../middleware/auth');

// Influencer dashboard için satış istatistiklerini getir
router.get('/stats', authenticateToken, async (req, res) => {
  const influencerId = req.user.userId;

  try {
    // Son 30 gündeki satışları al
    const sales = await db('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencerId)
      .where('sales.recorded_at', '>=', db.raw("date('now', '-30 days')"))
      .select(
        'sales.recorded_at as date',
        'sales.commission as commission_amount'
      )
      .orderBy('sales.recorded_at', 'asc');

    // Verileri günlere göre grupla
    const salesByDay = sales.reduce((acc, sale) => {
      const date = new Date(sale.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { salesCount: 0, totalCommission: 0 };
      }
      acc[date].salesCount += 1;
      acc[date].totalCommission += sale.commission_amount;
      return acc;
    }, {});

    // Son 30 gün için etiket ve veri dizileri oluştur
    const labels = [];
    const salesCountData = [];
    const commissionData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      labels.push(dateString);
      
      const dayData = salesByDay[dateString];
      salesCountData.push(dayData ? dayData.salesCount : 0);
      commissionData.push(dayData ? dayData.totalCommission : 0);
    }

    res.json({
      salesTrend: {
        labels,
        datasets: [
          {
            label: 'Günlük Satış Adedi',
            data: salesCountData,
            borderColor: 'rgba(99, 102, 241, 1)',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            tension: 0.35
          },
          {
            label: 'Günlük Komisyon (TL)',
            data: commissionData,
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            tension: 0.35
          }
        ]
      }
    });
  } catch (error) {
    console.error('Satış istatistikleri alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;