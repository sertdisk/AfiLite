const knex = require('./../src/db/sqlite');

module.exports = async () => {
  await knex.destroy();
};