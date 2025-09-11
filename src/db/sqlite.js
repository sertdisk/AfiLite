const knexLib = require('knex')
const knexfile = require('../../knexfile')

const environment = process.env.NODE_ENV || 'development'
const config = knexfile[environment]

const knex = knexLib(config)


/**
 * Verilen e-posta adresine göre influencer'ı veritabanında arar.
 * @param {string} email - Aranacak influencer'ın e-posta adresi.
 * @returns {Promise<object|null>} Bulunan influencer nesnesi veya null.
 */
async function checkInfluencer(email) {
  const influencer = await knex('influencers').where({ email }).first()
  return influencer
}


module.exports = knex
module.exports.checkInfluencer = checkInfluencer