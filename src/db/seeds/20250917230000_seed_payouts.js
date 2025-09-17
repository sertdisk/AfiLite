/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Update existing payout to 'completed' and add missing details
  await knex('payouts')
    .where({ influencer_id: 82, status: 'pending' })
    .update({
      status: 'completed',
      method: 'Bank Transfer',
      account: 'TR123456789012345678901234',
      bank_name: 'Example Bank',
      account_holder_name: 'Test Influencer',
      updated_at: knex.fn.now()
    });

  // Add another completed payout for influencer 82
  await knex('payouts').insert([
    {
      influencer_id: 82,
      amount: 250.00,
      iban: 'TR987654321098765432109876',
      status: 'completed',
      note: 'Monthly payment',
      method: 'Bank Transfer',
      account: 'TR987654321098765432109876',
      bank_name: 'Another Bank',
      account_holder_name: 'Test Influencer',
      balance_before: 248.10,
      balance_after: 498.10,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // Add a completed payout for influencer 85 (example for other influencer)
  await knex('payouts').insert([
    {
      influencer_id: 85,
      amount: 150.00,
      iban: 'TR112233445566778899001122',
      status: 'completed',
      note: 'Campaign payment',
      method: 'Bank Transfer',
      account: 'TR112233445566778899001122',
      bank_name: 'Third Bank',
      account_holder_name: 'Another Influencer',
      balance_before: 100.00,
      balance_after: 250.00,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};