// Validasyon middleware'leri
const validateInfluencerApplication = (req, res, next) => {
  const { full_name, email, phone, social_media, followers, iban, tax_type, about, message } = req.body;
  
  const errors = [];
  
  if (!full_name || full_name.trim().length < 2) {
    errors.push('Tam ad en az 2 karakter olmalıdır');
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Geçerli bir email adresi giriniz');
  }
  
  if (!phone || !/^\+?[\d\s-()]{10,}$/.test(phone)) {
    errors.push('Geçerli bir telefon numarası giriniz');
  }
  
  if (!social_media || !Array.isArray(social_media) || social_media.length === 0) {
    errors.push('En az bir sosyal medya hesabı bilgisi giriniz');
  }
  
  if (!followers || isNaN(followers) || parseInt(followers) < 1000) {
    errors.push('Takipçi sayısı en az 1000 olmalıdır');
  }
  
  if (!iban || !/^TR\d{26}$/.test(iban)) {
    errors.push('Geçerli bir IBAN giriniz (TR ile başlamalı, toplam 26 karakter)');
  }
  
  if (!tax_type || !['individual', 'company'].includes(tax_type)) {
    errors.push('Vergi tipi "individual" veya "company" olmalıdır');
  }
  
  if (!about || about.trim().length < 10) {
    errors.push('Hakkınızda alanı en az 10 karakter olmalıdır');
  }
  
  if (!message || message.trim().length < 10) {
    errors.push('Mesaj alanı en az 10 karakter olmalıdır');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

const validateDiscountCode = (req, res, next) => {
  const { code, discount_percentage, influencer_id } = req.body;
  
  const errors = [];
  
  if (!code || code.trim().length < 3) {
    errors.push('Kod en az 3 karakter olmalıdır');
  }
  
  if (discount_percentage === undefined || discount_percentage === null ||
      isNaN(discount_percentage) || discount_percentage < 1 || discount_percentage > 100) {
    errors.push('İndirim yüzdesi 1-100 arasında olmalıdır');
  }
  
  if (!influencer_id || isNaN(influencer_id) || parseInt(influencer_id) <= 0) {
    errors.push('Geçerli bir influencer ID giriniz');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

const validateSale = (req, res, next) => {
  const { code, total_amount } = req.body;
  
  const errors = [];
  
  if (!code || typeof code !== 'string' || code.trim().length < 3) {
    errors.push('Kod en az 3 karakter olmalıdır');
  }
  
  if (total_amount === undefined || total_amount === null ||
      isNaN(total_amount) || parseFloat(total_amount) <= 0) {
    errors.push('Geçerli bir toplam tutar giriniz');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  const errors = [];
  
  if (isNaN(page) || page < 1) {
    errors.push('Sayfa numarası 1 veya daha büyük olmalıdır');
  }
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    errors.push('Limit 1-100 arasında olmalıdır');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  // Query parametrelerini sayıya çevir
  req.query.page = parseInt(page);
  req.query.limit = parseInt(limit);
  
  next();
};

module.exports = {
  validateInfluencerApplication,
  validateDiscountCode,
  validateSale,
  validatePagination
};