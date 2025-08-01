exports.seed = async (knex) => {
  // Sıralı sil → ekle (foreign key sırasına dikkat)
  await knex('sales').del();
  await knex('discount_codes').del();
  await knex('influencers').del();

  // Influencerlar
  const [id1, id2, id3] = await knex('influencers').insert([
    { full_name: 'Ali Yılmaz', tax_type: 'individual', phone: '+905551111111', email: 'ali@example.com', iban: 'TR11', socials: JSON.stringify([{ platform: 'instagram', handle: '@ali', followers: 25000 }]), status: 'approved' },
    { full_name: 'Zeynep Aydın', tax_type: 'company', phone: '+905552222222', email: 'zeynep@example.com', iban: 'TR22', socials: JSON.stringify([{ platform: 'tiktok', handle: '@zey', followers: 80000 }]), status: 'approved' },
    { full_name: 'Can Demir', tax_type: 'individual', phone: '+905553333333', email: 'can@example.com', iban: 'TR33', socials: JSON.stringify([{ platform: 'twitter', handle: '@can', followers: 12000 }]), status: 'pending' }
  ]).returning('id');

  // Kodlar
  const codes = await knex('discount_codes').insert([
    { influencer_id: id1.id, code: 'ALI10', discount_pct: 10, commission_pct: 40 },
    { influencer_id: id1.id, code: 'ALI20', discount_pct: 20, commission_pct: 30 },
    { influencer_id: id2.id, code: 'ZEY15', discount_pct: 15, commission_pct: 35 },
    { influencer_id: id2.id, code: 'ZEY25', discount_pct: 25, commission_pct: 25 },
    { influencer_id: id3.id, code: 'CAN05', discount_pct: 5, commission_pct: 45 }
  ]).returning('code');

  // Satışlar (10 kayıt)
  const sales = [];
  for (let i = 1; i <= 10; i++) {
    const code = codes[i % codes.length].code;
    const total = (i * 100) + 50;
    const commission = total * 0.4;
    sales.push({ code, total_amount: total, commission });
  }
  await knex('sales').insert(sales);
};