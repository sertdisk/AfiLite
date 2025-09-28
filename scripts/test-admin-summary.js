const jwt = require('jsonwebtoken');

// Create a test JWT token for admin user
const token = jwt.sign(
  { id: 84, userId: 84, email: 'admin@afi.com', role: 'admin' },
  'your_super_secret_key_for_jwt', // This should match your JWT_SECRET in .env
  { expiresIn: '1h' }
);

console.log('Test admin token:', token);

// Test the endpoint
async function testAdminSummary() {
  try {
    const response = await fetch('http://localhost:5003/api/v1/balance/admin-summary/summary', {
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

testAdminSummary();