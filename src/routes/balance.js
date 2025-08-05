/**
 * Türkçe: Bu dosya influencer bakiye uçlarını içerir.
 * Güvenlik: Hatalar merkezi handler'a devredildi, PII sızıntısı engellendi.
 * - try/catch kaldırıldı, [middleware/errorHandler.js:59-62 asyncHandler()] ile sarıldı.
 * - Kaynak erişimi [middleware/auth.js:59-101 authorizeResourceAccess('influencer_id')] ile sınırlandı.
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeResourceAccess } = require('../middleware/auth');
const { saleReportLimiter } = require('../middleware/rateLimiter');

// Influencer bakiye sorgulama
router.get('/balance/:influencer_id', authorizeResourceAccess('influencer_id'), asyncHandler(async (req, res) => {
 const { influencer_id } = req.params;
 
 const influencer = await knex('influencers').where('id', influencer_id).first();
 if (!influencer) {
   const err = new Error('Influencer bulunamadı');
   err.status = 404;
   throw err;
 }
 
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
 
 const totalSales = sales.length;
 const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
 const totalCommission = sales.reduce((sum, sale) => sum + sale.commission, 0);
 
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
   recent_sales: sales.slice(0, 10)
 });
}));

// Influencer bakiye geçmişi
router.get('/balance/:influencer_id/history', authorizeResourceAccess('influencer_id'), asyncHandler(async (req, res) => {
 const { influencer_id } = req.params;
 
 const influencer = await knex('influencers').where('id', influencer_id).first();
 if (!influencer) {
   const err = new Error('Influencer bulunamadı');
   err.status = 404;
   throw err;
 }
 
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
}));

// Tüm influencer'ların özet bakiyeleri
router.get('/balance', asyncHandler(async (req, res) => {
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
 
 if (status) {
   query = query.where('influencers.status', status);
 }
 
 const offset = (page - 1) * limit;
 query = query.limit(limit).offset(offset);
 
 const balances = await query.orderBy('total_commission', 'desc');
 
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
}));

// Ödeme raporu oluşturma
router.get('/balance/report/:influencer_id', saleReportLimiter, authorizeResourceAccess('influencer_id'), asyncHandler(async (req, res) => {
 const { influencer_id } = req.params;
 const { start_date, end_date } = req.query;
 
 const influencer = await knex('influencers').where('id', influencer_id).first();
 if (!influencer) {
   const err = new Error('Influencer bulunamadı');
   err.status = 404;
   throw err;
 }
 
 let query = knex('sales')
   .join('discount_codes', 'sales.code', 'discount_codes.code')
   .where('discount_codes.influencer_id', influencer_id);
 
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
}));

module.exports = router;