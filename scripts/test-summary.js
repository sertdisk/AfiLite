const jwt = require('jsonwebtoken');

// Create a test JWT token for user_id = 2
const token = jwt.sign(
  { id: 2, user_id: 2, email: 'inf1@test.com', role: 'influencer' },
  'your_super_secret_key_for_jwt_token_signing', // This should match your JWT_SECRET in .env
  { expiresIn: '1h' }
);

console.log('Test token:', token);

// Test the endpoint
async function testSummary() {
  try {
    const response = await fetch('http://localhost:5003/api/v1/influencers/me/summary', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSummary();