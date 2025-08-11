const express = require('express');
const knex = require('../db/sqlite');

const router = express.Router();

// Aktif sözleşme içeriğini getir
router.get('/active', async (req, res, next) => {
  try {
    const contract = await knex('contracts')
      .where('is_active', true)
      .first();
    
    if (!contract) {
      return res.status(404).json({ error: 'Aktif sözleşme bulunamadı' });
    }
    
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Tüm sözleşme versiyonlarını listele (sadece admin için)
router.get('/', async (req, res, next) => {
  try {
    // Bu endpoint sadece admin tarafından erişilebilir olmalı
    // Auth middleware ile korunmalı
    const contracts = await knex('contracts')
      .select('*')
      .orderBy('version', 'desc');
    
    res.json(contracts);
  } catch (error) {
    next(error);
  }
});

// Yeni sözleşme versiyonu oluştur (sadece admin için)
router.post('/', async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Sözleşme içeriği boş olamaz' });
    }
    
    // Mevcut en yüksek versiyonu bul
    const latestContract = await knex('contracts')
      .max('version as maxVersion')
      .first();
    
    const newVersion = latestContract?.maxVersion ? latestContract.maxVersion + 1 : 1;
    
    // Önceki aktif sözleşmeleri pasif yap
    await knex('contracts')
      .where('is_active', true)
      .update({ is_active: false });
    
    // Yeni sözleşmeyi oluştur ve aktif yap
    const [newContractId] = await knex('contracts').insert({
      content: content.trim(),
      version: newVersion,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    const newContract = await knex('contracts')
      .where('id', newContractId)
      .first();
    
    res.status(201).json(newContract);
  } catch (error) {
    next(error);
  }
});

module.exports = router;