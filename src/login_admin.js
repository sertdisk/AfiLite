async function loginAdmin() {
  const { default: fetch } = await import('node-fetch');
  const url = 'http://localhost:5003/api/v1/auth/admin/login';
  const email = 'admin@afi.com';
  const password = '123456';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Token:', data.token);
    } else {
      console.error('Login failed:', data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error during login:', error.message);
  }
}

loginAdmin();