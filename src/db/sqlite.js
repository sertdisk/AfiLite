const knexLib = require('knex');
const knexfile = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

const knex = knexLib(config);

 
/**
 * Verilen e-posta adresine göre influencer'ı veritabanında arar.
 * @param {string} email - Aranacak influencer'ın e-posta adresi.
 * @returns {Promise<object|null>} Bulunan influencer nesnesi veya null.
 */
async function checkInfluencer(email) {
  try {
    console.log(`[DEBUG] checkInfluencer çağrıldı, email: ${email}`);
    const influencer = await knex('influencers').where({ email }).first();
    if (influencer) {
      console.log(`[DEBUG] Influencer bulundu: ${influencer.email}`);
    } else {
      console.log(`[DEBUG] Influencer bulunamadı: ${email}`);
    }
    return influencer;
  } catch (error) {
    console.error(`[ERROR] checkInfluencer hatası: ${error.message}`);
    throw error; // Hatanın yayılmasını sağla
  }
}
 
module.exports = knex;
module.exports.checkInfluencer = checkInfluencer;