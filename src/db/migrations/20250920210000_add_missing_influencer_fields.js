/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    // brand_name alanı
    const hasBrandName = await knex.schema.hasColumn('influencers', 'brand_name');
    if (!hasBrandName) {
      await knex.schema.table('influencers', (table) => {
        table.string('brand_name', 255).nullable();
      });
    }
    
    // country_code alanı
    const hasCountryCode = await knex.schema.hasColumn('influencers', 'country_code');
    if (!hasCountryCode) {
      await knex.schema.table('influencers', (table) => {
        table.string('country_code', 5).nullable();
      });
    }
    
    // is_whatsapp_active alanı
    const hasIsWhatsappActive = await knex.schema.hasColumn('influencers', 'is_whatsapp_active');
    if (!hasIsWhatsappActive) {
      await knex.schema.table('influencers', (table) => {
        table.boolean('is_whatsapp_active').defaultTo(false);
      });
    }
    
    // alternative_phone alanı
    const hasAlternativePhone = await knex.schema.hasColumn('influencers', 'alternative_phone');
    if (!hasAlternativePhone) {
      await knex.schema.table('influencers', (table) => {
        table.string('alternative_phone', 20).nullable();
      });
    }
    
    // platform_message alanı
    const hasPlatformMessage = await knex.schema.hasColumn('influencers', 'platform_message');
    if (!hasPlatformMessage) {
      await knex.schema.table('influencers', (table) => {
        table.text('platform_message').nullable();
      });
    }
    
    // business_type alanı
    const hasBusinessType = await knex.schema.hasColumn('influencers', 'business_type');
    if (!hasBusinessType) {
      await knex.schema.table('influencers', (table) => {
        table.string('business_type', 20).nullable();
      });
    }
    
    // commercial_title alanı
    const hasCommercialTitle = await knex.schema.hasColumn('influencers', 'commercial_title');
    if (!hasCommercialTitle) {
      await knex.schema.table('influencers', (table) => {
        table.string('commercial_title', 255).nullable();
      });
    }
    
    // tax_office alanı
    const hasTaxOffice = await knex.schema.hasColumn('influencers', 'tax_office');
    if (!hasTaxOffice) {
      await knex.schema.table('influencers', (table) => {
        table.string('tax_office', 100).nullable();
      });
    }
    
    // tax_number alanı
    const hasTaxNumber = await knex.schema.hasColumn('influencers', 'tax_number');
    if (!hasTaxNumber) {
      await knex.schema.table('influencers', (table) => {
        table.string('tax_number', 20).nullable();
      });
    }
    
    // business_address alanı
    const hasBusinessAddress = await knex.schema.hasColumn('influencers', 'business_address');
    if (!hasBusinessAddress) {
      await knex.schema.table('influencers', (table) => {
        table.text('business_address').nullable();
      });
    }
    
    // general_message alanı
    const hasGeneralMessage = await knex.schema.hasColumn('influencers', 'general_message');
    if (!hasGeneralMessage) {
      await knex.schema.table('influencers', (table) => {
        table.text('general_message').nullable();
      });
    }
    
    // terms_accepted alanı
    const hasTermsAccepted = await knex.schema.hasColumn('influencers', 'terms_accepted');
    if (!hasTermsAccepted) {
      await knex.schema.table('influencers', (table) => {
        table.boolean('terms_accepted').notNullable().defaultTo(false);
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('influencers');
  if (hasTable) {
    const columnsToRemove = [
      'brand_name',
      'country_code',
      'is_whatsapp_active',
      'alternative_phone',
      'platform_message',
      'business_type',
      'commercial_title',
      'tax_office',
      'tax_number',
      'business_address',
      'general_message',
      'terms_accepted'
    ];
    
    for (const column of columnsToRemove) {
      const hasColumn = await knex.schema.hasColumn('influencers', column);
      if (hasColumn) {
        await knex.schema.table('influencers', (table) => {
          table.dropColumn(column);
        });
      }
    }
  }
};