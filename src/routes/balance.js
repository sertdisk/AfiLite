const router = require('express').Router();
const knex = require('../db/sqlite');

// Influencer bakiye sorgulama
router.get('/balance/:influencer_id', async (req, res) => {
  try {
    const { influencer_id } = req.params;
    
    // Influencer kontrolü
    const influencer = await knex('influencers').where('id', influencer_id).first();
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer bulunamadı' });
    }
    
    // Toplam satış ve komisyon hesaplama
    const sales = await knex('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencer_id)
      .select(
        'sales.total_amount',
        'sales.commission',
        'sales.recorded_at',
        'sales.code'
      )
      .orderBy('sales.recorded_at', 'desc');
    
    // Bakiye hesaplamaları
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalCommission = sales.reduce((sum, sale) => sum + sale.commission, 0);
    
    // Aylık istatistikler
    const monthlyStats = await knex('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencer_id)
      .select(
        knex.raw("strftime('%Y-%m', sales.recorded_at) as month"),
        knex.raw('COUNT(*) as sales_count'),
        knex.raw('SUM(sales.total_amount) as monthly_revenue'),
        knex.raw('SUM(sales.commission) as monthly_commission')
      )
      .groupBy('month')
      .orderBy('month', 'desc')
      .limit(12);
    
    // Kod bazlı istatistikler
    const codeStats = await knex('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencer_id)
      .select(
        'sales.code',
        knex.raw('COUNT(*) as usage_count'),
        knex.raw('SUM(sales.total_amount) as total_revenue'),
        knex.raw('SUM(sales.commission) as total_commission'),
        knex.raw('AVG(sales.total_amount) as avg_sale_amount')
      )
      .groupBy('sales.code')
      .orderBy('total_commission', 'desc');
    
    res.json({
      influencer: {
        id: influencer.id,
        full_name: influencer.full_name,
        email: influencer.email,
        status: influencer.status
      },
      balance: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        pending_commission: influencer.status === 'approved' ? totalCommission : 0
      },
      monthly_stats: monthlyStats,
      code_stats: codeStats,
      recent_sales: sales.slice(0, 10) // Son 10 satış
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Influencer bakiye geçmişi
router.get('/balance/:influencer_id/history', async (req, res) => {
  try {
    const { influencer_id } = req.params;
    
    // Influencer kontrolü
    const influencer = await knex('influencers').where('id', influencer_id).first();
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer bulunamadı' });
    }
    
    // Satış geçmişini getir
    const history = await knex('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencer_id)
      .select(
        'sales.id',
        'sales.code',
        'sales.total_amount',
        'sales.commission',
        'sales.recorded_at'
      )
      .orderBy('sales.recorded_at', 'desc');
    
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tüm influencer'ların özet bakiyeleri
router.get('/balance', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = knex('influencers')
      .leftJoin('discount_codes', 'influencers.id', 'discount_codes.influencer_id')
      .leftJoin('sales', 'discount_codes.code', 'sales.code')
      .select(
        'influencers.id',
        'influencers.full_name',
        'influencers.email',
        'influencers.status',
        knex.raw('COUNT(DISTINCT discount_codes.id) as total_codes'),
        knex.raw('COUNT(sales.id) as total_sales'),
        knex.raw('COALESCE(SUM(sales.total_amount), 0) as total_revenue'),
        knex.raw('COALESCE(SUM(sales.commission), 0) as total_commission')
      )
      .groupBy('influencers.id', 'influencers.full_name', 'influencers.email', 'influencers.status');
    
    // Duruma göre filtreleme
    if (status) {
      query = query.where('influencers.status', status);
    }
    
    // Sayfalama
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    const balances = await query.orderBy('total_commission', 'desc');
    
    // Toplam istatistikler
    const totalQuery = knex('influencers')
      .leftJoin('discount_codes', 'influencers.id', 'discount_codes.influencer_id')
      .leftJoin('sales', 'discount_codes.code', 'sales.code')
      .select(
        knex.raw('COUNT(DISTINCT influencers.id) as total_influencers'),
        knex.raw('COUNT(DISTINCT discount_codes.id) as total_codes'),
        knex.raw('COUNT(sales.id) as total_sales'),
        knex.raw('COALESCE(SUM(sales.total_amount), 0) as total_revenue'),
        knex.raw('COALESCE(SUM(sales.commission), 0) as total_commission')
      );
    
    if (status) {
      totalQuery.where('influencers.status', status);
    }
    
    const [totals] = await totalQuery;
    
    res.json({
      balances,
      totals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totals.total_influencers,
        pages: Math.ceil(totals.total_influencers / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ödeme raporu oluşturma
router.get('/balance/report/:influencer_id', async (req, res) => {
  try {
    const { influencer_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Influencer kontrolü
    const influencer = await knex('influencers').where('id', influencer_id).first();
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer bulunamadı' });
    }
    
    let query = knex('sales')
      .join('discount_codes', 'sales.code', 'discount_codes.code')
      .where('discount_codes.influencer_id', influencer_id);
    
    // Tarih filtresi
    if (start_date) {
      query = query.where('sales.recorded_at', '>=', new Date(start_date));
    }
    
    if (end_date) {
      query = query.where('sales.recorded_at', '<=', new Date(end_date));
    }
    
    const sales = await query
      .select(
        'sales.id',
        'sales.code',
        'sales.total_amount',
        'sales.commission',
        'sales.recorded_at'
      )
      .orderBy('sales.recorded_at', 'desc');
    
    const totalCommission = sales.reduce((sum, sale) => sum + sale.commission, 0);
    
    res.json({
      influencer: {
        id: influencer.id,
        full_name: influencer.full_name,
        email: influencer.email,
        iban: influencer.iban
      },
      report: {
        period: {
          start_date: start_date || 'Başlangıç',
          end_date: end_date || 'Bitiş'
        },
        total_sales: sales.length,
        total_commission: totalCommission,
        sales: sales
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;