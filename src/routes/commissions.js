/**
 * Komisyon yönetimi uçları
 * - Admin komisyonları yönetebilir
 * - Influencer kendi komisyon geçmişini görebilir
 */
const router = require('express').Router();
const knex = require('../db/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /commissions - Komisyonları listele (Admin)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { status, influencerId, from, to, page = 1, limit = 50 } = req.query;
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.id',
      'sales.code',
      'sales.total_amount',
      'sales.commission',
      'sales.recorded_at',
      'influencers.id as influencer_id',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy('sales.recorded_at', 'desc');
  
  if (status) {
    query = query.where('sales.status', status);
  }
  
  if (influencerId) {
    query = query.where('discount_codes.influencer_id', influencerId);
  }
  
  if (from) {
    query = query.where('sales.recorded_at', '>=', new Date(from));
  }
  
  if (to) {
    query = query.where('sales.recorded_at', '<=', new Date(to));
  }
  
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset);
  
  const commissions = await query;
  
  const totalQuery = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code');
  
  if (status) totalQuery.where('sales.status', status);
  if (influencerId) totalQuery.where('discount_codes.influencer_id', influencerId);
  if (from) totalQuery.where('sales.recorded_at', '>=', new Date(from));
  if (to) totalQuery.where('sales.recorded_at', '<=', new Date(to));
  
  const [{ count }] = await totalQuery.count('* as count');
  
  res.json({
    commissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
}));

// GET /commissions/export - Komisyonları export et (Admin)
router.get('/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { format = 'csv', status, influencerId, from, to } = req.query;
  
  let query = knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .join('influencers', 'discount_codes.influencer_id', 'influencers.id')
    .select(
      'sales.id',
      'sales.code',
      'sales.total_amount',
      'sales.commission',
      'sales.recorded_at',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy('sales.recorded_at', 'desc');
  
  if (status) {
    query = query.where('sales.status', status);
  }
  
  if (influencerId) {
    query = query.where('discount_codes.influencer_id', influencerId);
  }
  
  if (from) {
    query = query.where('sales.recorded_at', '>=', new Date(from));
  }
  
  if (to) {
    query = query.where('sales.recorded_at', '<=', new Date(to));
  }
  
  const commissions = await query;
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="commissions.csv"');
    
    const headers = ['ID', 'Code', 'Total Amount', 'Commission', 'Recorded At', 'Influencer Name', 'Influencer Email'];
    res.write(headers.join(',') + '\n');
    
    for (const commission of commissions) {
      const row = [
        commission.id,
        `"${commission.code}"`,
        commission.total_amount,
        commission.commission,
        `"${commission.recorded_at}"`,
        `"${commission.influencer_name || ''}"`,
        `"${commission.influencer_email || ''}"`
      ];
      res.write(row.join(',') + '\n');
    }
    
    res.end();
  } else if (format === 'xlsx') {
    // Excel export için exceljs kütüphanesini kullan
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commissions');
    
    // Başlıklar
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Commission', key: 'commission', width: 15 },
      { header: 'Recorded At', key: 'recorded_at', width: 20 },
      { header: 'Influencer Name', key: 'influencer_name', width: 25 },
      { header: 'Influencer Email', key: 'influencer_email', width: 30 }
    ];
    
    // Verileri ekle
    worksheet.addRows(commissions);
    
    // Excel dosyasını oluştur ve gönder
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="commissions.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } else {
    res.json({ commissions });
  }
}));

module.exports = router;