async function testAccounts() {
  const { default: fetch } = await import('node-fetch');
  
  // Base URL
  const baseUrl = 'http://localhost:5003/api/v1';
  
  // Test kullanıcı bilgileri
  const adminCredentials = {
    email: 'admin@afi.com',
    password: '123456'
  };
  
  const influencerCredentials = {
    email: 'inf1@test.com',
    password: '123456'
  };
  
  try {
    // 1. Admin kullanıcısı ile login ol ve token al
    console.log('Admin kullanıcısı ile login olunuyor...');
    const adminLoginResponse = await fetch(`${baseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminCredentials)
    });
    
    const adminLoginData = await adminLoginResponse.json();
    
    if (!adminLoginResponse.ok) {
      console.error('Admin login başarısız:', adminLoginData.message || 'Bilinmeyen hata');
      return;
    }
    
    const adminToken = adminLoginData.token;
    console.log('Admin token alındı:', adminToken);
    
    // 2. Influencer kullanıcısı ile login ol ve token al
    console.log('\nInfluencer kullanıcısı ile login olunuyor...');
    const influencerLoginResponse = await fetch(`${baseUrl}/auth/influencer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(influencerCredentials)
    });
    
    const influencerLoginData = await influencerLoginResponse.json();
    
    if (!influencerLoginResponse.ok) {
      console.error('Influencer login başarısız:', influencerLoginData.message || 'Bilinmeyen hata');
      return;
    }
    
    const influencerToken = influencerLoginData.token;
    console.log('Influencer token alındı:', influencerToken);
    
    // 3. Admin dashboard verilerini çek
    console.log('\nAdmin dashboard verileri çekiliyor...');
    const adminDashboardResponse = await fetch(`${baseUrl}/balance/admin-summary/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const adminDashboardData = await adminDashboardResponse.json();
    
    if (!adminDashboardResponse.ok) {
      console.error('Admin dashboard verileri çekilemedi:', adminDashboardData.message || 'Bilinmeyen hata');
      return;
    }
    
    console.log('Admin dashboard verileri:');
    console.log(JSON.stringify(adminDashboardData, null, 2));
    
    // 4. Influencer dashboard verilerini çek
    console.log('\nInfluencer dashboard verileri çekiliyor...');
    const influencerDashboardResponse = await fetch(`${baseUrl}/influencer/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${influencerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const influencerDashboardData = await influencerDashboardResponse.json();
    
    if (!influencerDashboardResponse.ok) {
      console.error('Influencer dashboard verileri çekilemedi:', influencerDashboardData.message || 'Bilinmeyen hata');
      return;
    }
    
    console.log('Influencer dashboard verileri:');
    console.log(JSON.stringify(influencerDashboardData, null, 2));
    
    console.log('\nTüm işlemler başarıyla tamamlandı.');
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  }
}

testAccounts();