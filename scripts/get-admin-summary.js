const https = require('https');
const http = require('http');

// Endpoint URL
const url = 'http://localhost:3000/api/v1/balance/admin-summary/summary';

// Authentication token (bu değeri betik çalıştırılırken parametre olarak alabiliriz)
const token = process.argv[2] || process.env.AUTH_TOKEN;

if (!token) {
 console.error('Error: Authentication token is required.');
  console.error('Please provide the token as a command line argument or set AUTH_TOKEN environment variable.');
  process.exit(1);
}

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
};

// URL'nin protokolüne göre http veya https modülünü seç
const protocol = url.startsWith('https') ? https : http;

const req = protocol.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Admin Summary:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.end();