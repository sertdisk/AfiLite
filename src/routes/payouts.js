/**
 * Ödeme (payout) yönetimi uçları
 * - Admin ödemeleri yönetebilir
 * - Influencer ödeme geçmişini görebilir
 */
const router = require('express').Router()
const knex = require('../db/sqlite')
const { asyncHandler } = require('../middleware/errorHandler')
const { authenticateToken, requireAdmin } = require('../middleware/auth')

// GET /payouts - Ödemeleri listele (Admin)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  const { status, influencer_id, start_date, end_date, page = 1, limit = 50 } = req.query

  let query = knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.id',
      'payouts.influencer_id',
      'payouts.amount',
      'payouts.iban',
      'payouts.status',
      'payouts.note',
      'payouts.created_at',
      'payouts.updated_at',
      'payouts.balance_before',
      'payouts.balance_after',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )

  if (status) {
    query.where('payouts.status', status)
  }

  if (influencer_id) {
    query.where('payouts.influencer_id', influencer_id)
  }

  if (start_date) {
    query.where('payouts.created_at', '>=', new Date(start_date))
  }

  if (end_date) {
    query.where('payouts.created_at', '<=', new Date(end_date))
  }

  // Get total count with filters applied
  const totalResult = await query.clone().count('* as count').first();
  const total = totalResult.count;

  // Apply ordering and pagination
  const payouts = await query.orderBy(knex.raw('datetime(payouts.created_at)'), 'desc').limit(limit).offset((page - 1) * limit);

  res.json({
    items: payouts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      pages: Math.ceil(total / limit)
    }
  })
}))

// POST /payouts - Yeni ödeme oluştur (Admin)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  const { influencer_id, amount, iban, note } = req.body
  const status = 'completed'

  if (!influencer_id || !amount || !iban) {
    const err = new Error('Influencer ID, amount ve IBAN zorunludur')
    err.status = 400
    throw err
  }

  const influencer = await knex('influencers').where('id', influencer_id).first()
  if (!influencer) {
    const err = new Error('Influencer bulunamadı')
    err.status = 404
    throw err
  }

  // Bakiye hesaplaması
  const tc = await knex('sales')
    .join('discount_codes', 'sales.code', 'discount_codes.code')
    .where('discount_codes.influencer_id', influencer_id)
    .sum('sales.commission as total_commission')
    .first()

  const tp = await knex('payouts')
    .where({ influencer_id: influencer_id, status: 'completed' })
    .sum('amount as total_payouts')
    .first()

  const balance_before = (parseFloat(tc.total_commission) || 0) - (parseFloat(tp.total_payouts) || 0)
  const balance_after = balance_before - Number(amount)

  // Ödeme oluştur
  const [id] = await knex('payouts').insert({
    influencer_id: influencer_id,
    amount: Number(amount),
    iban: String(iban).trim(),
    note: note || null,
    status: String(status).trim(),
    balance_before,
    balance_after
  })

  const payout = await knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .where('payouts.id', id)
    .first()

  res.status(201).json({
    message: 'Ödeme oluşturuldu',
    payout_id: id,
    payout
  })
}))

// PATCH /payouts/:id - Ödemeyi güncelle (Admin)
router.patch('/:id', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  const { id } = req.params
  const { note } = req.body

  const payout = await knex('payouts').where({ id }).first()
  if (!payout) {
    return res.status(404).json({ message: 'Ödeme bulunamadı' })
  }

  const updatePayload = {}
  if (note !== undefined) {
    updatePayload.note = note
  }

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: 'Güncellenecek alan yok' })
  }

  await knex('payouts').where({ id }).update(updatePayload)

  const updatedPayout = await knex('payouts').where({ id }).first()
  res.json(updatedPayout)
}))

// GET /api/payouts/:id - Tek bir ödeme detayı
router.get('/api/payouts/:id', authenticateToken, asyncHandler(async(req, res) => {
  const payout = await knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.*',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .where('payouts.id', req.params.id)
    .first()

  if (!payout) {
    // Eğer ödeme bulunamazsa boş bir dizi döndür
    return res.json({})
  }

  // Admin değilse sadece kendi ödemelerini görebilir
  if (req.user.role !== 'admin' && payout.influencer_id !== (req.user.userId || req.user.user_id || req.user.id)) {
    const err = new Error('Bu ödemeye erişim yetkiniz yok')
    err.status = 403
    throw err
  }

  res.json(payout)
}))


// GET /export - Ödemeleri export et (Admin)
router.get('/export', authenticateToken, requireAdmin, asyncHandler(async(req, res) => {
  const { format = 'csv', status, influencer_id, start_date, end_date } = req.query

  let query = knex('payouts')
    .join('influencers', 'payouts.influencer_id', 'influencers.id')
    .select(
      'payouts.id',
      'payouts.influencer_id',
      'payouts.amount',
      'payouts.iban',
      'payouts.status',
      'payouts.note',
      'payouts.created_at',
      'payouts.updated_at',
      'payouts.balance_before',
      'payouts.balance_after',
      'influencers.full_name as influencer_name',
      'influencers.email as influencer_email'
    )
    .orderBy(knex.raw('datetime(payouts.created_at)'), 'desc')


  if (influencer_id) {
    query = query.where('payouts.influencer_id', influencer_id)
  }

  if (start_date) {
    query = query.where('payouts.created_at', '>=', new Date(start_date))
  }

  if (end_date) {
    query = query.where('payouts.created_at', '<=', new Date(end_date))
  }

  const payouts = await query

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"')

    const headers = ['ID', 'Influencer ID', 'Influencer Name', 'Email', 'Amount', 'IBAN', 'Status', 'Note', 'Created At', 'Balance Before', 'Balance After']
    res.write(headers.join(',') + '\n')

    for (const payout of payouts) {
      const row = [
        payout.id,
        payout.influencer_id,
        `"${payout.influencer_name}"`, // Corrected escaping for influencer_name
        `"${payout.influencer_email}"`, // Corrected escaping for influencer_email
        payout.amount,
        `"${payout.iban}"`, // Corrected escaping for iban
        payout.status,
        `"${payout.note || ''}"`, // Corrected escaping for note
        payout.created_at,
        payout.balance_before,
        payout.balance_after
      ]
      res.write(row.join(',') + '\n')
    }

    res.end()
  } else if (format === 'xlsx') {
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Payouts')

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Influencer ID', key: 'influencer_id', width: 15 },
      { header: 'Influencer Name', key: 'influencer_name', width: 25 },
      { header: 'Email', key: 'influencer_email', width: 30 },
      { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '#,##0.00 ₺' } },
      { header: 'IBAN', key: 'iban', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Note', key: 'note', width: 30 },
      { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
      { header: 'Balance Before', key: 'balance_before', width: 15, style: { numFmt: '#,##0.00 ₺' } },
      { header: 'Balance After', key: 'balance_after', width: 15, style: { numFmt: '#,##0.00 ₺' } },
    ]

    worksheet.addRows(payouts)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.xlsx"')

    await workbook.xlsx.write(res)
    res.end()
  } else {
    res.json({ payouts })
  }
}))

module.exports = router