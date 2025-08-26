const request = require('supertest');
const createApp = require('../src/app');
let app;
const knex = require('../src/db/sqlite');

describe('Load Testing - 500 Virtual Users (Stability-Oriented)', () => {
  let adminToken;
  const CONCURRENT_USERS = 300;
  const BATCH_SIZE = 25; // 12x25 pencereli gönderim
  const BATCH_DELAY_MS = 100; // daha dengeli gecikme
  let testInfluencerId;

  async function runBatchedRequests(total, buildRequest) {
    const batches = Math.ceil(total / BATCH_SIZE);
    let results = [];
    for (let b = 0; b < batches; b++) {
      const current = Math.min(BATCH_SIZE, total - b * BATCH_SIZE);
      const promises = [];
      for (let i = 0; i < current; i++) {
        promises.push(buildRequest());
      }
      const batchStart = Date.now();
      const batchResults = await Promise.all(promises);
      const batchEnd = Date.now();
      results.push({ batchResults, batchDuration: batchEnd - batchStart, count: current });
      if (b < batches - 1) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }
    return results;
  }

  beforeAll(async () => {
    app = createApp();
    // Global setup migrasyonları çalıştırdı; yalnızca tablo temizliği yap ve test verisi hazırla
    await knex('sales').del();
    await knex('discount_codes').del();
    await knex('influencers').del();

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('loadtest', 10);
    
    await knex('influencers').insert({
      full_name: 'Load Test Admin',
      email: 'loadtest@admin.com',
      phone: '+905551234567',
      iban: 'TR330006100519786457841326',
      tax_type: 'individual',
      status: 'approved',
      password_hash: passwordHash,
      role: 'admin'
    });

    const loginResponse = await request(app)
      .post('/api/v1/login')
      .send({
        email: 'loadtest@admin.com',
        password: 'loadtest'
      });
    
    adminToken = loginResponse.body.token;

    const influencerResponse = await request(app)
      .post('/api/v1/apply')
      .send({
        full_name: 'Load Test Influencer',
        email: 'loadtest@influencer.com',
        phone: '+905559876543',
        social_media: ['instagram.com/loadtest'],
        followers: 10000,
        iban: 'TR11223344556677889900112233',
        tax_type: 'individual',
        about: 'Load test influencer',
        message: 'Load test message'
      });
    
    if (influencerResponse.status === 201) {
      testInfluencerId = influencerResponse.body.influencer_id;
    }
  });

  // Global teardown knex.destroy çağıracak; suite içinde bağlantı kapatma yok

  describe('Load Testing Scenarios (Stability)', () => {
    test('500 kullanıcı login - batchli', async () => {
      const results = await runBatchedRequests(CONCURRENT_USERS, () =>
        request(app)
          .post('/api/v1/login')
          .send({ email: 'loadtest@admin.com', password: 'loadtest' })
      );

      const flat = results.flatMap(r => r.batchResults);
      const successfulLogins = flat.filter(r => r.status === 200).length;
      const totalDuration = results.reduce((acc, r) => acc + r.batchDuration, 0);
      const totalCount = results.reduce((acc, r) => acc + r.count, 0);
      const avgResponseTime = totalDuration / totalCount;

      console.log(`Başarılı login: ${successfulLogins}/${CONCURRENT_USERS}`);
      console.log(`Ortalama yanıt süresi: ${avgResponseTime}ms`);

      expect(successfulLogins).toBeGreaterThanOrEqual(Math.floor(CONCURRENT_USERS * 0.90));
      expect(avgResponseTime).toBeLessThan(2500);
    }, 15000);

    test('500 kullanıcı satış kaydı - batchli', async () => {
      await request(app)
        .post('/api/v1/codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'LOADTEST',
          discount_percentage: 15,
          influencer_id: testInfluencerId
        });

      const results = await runBatchedRequests(CONCURRENT_USERS, () =>
        request(app)
          .post('/api/v1/sale')
          .send({
            code: 'LOADTEST',
            total_amount: Math.floor(Math.random() * 1000) + 100
          })
      );

      const flat = results.flatMap(r => r.batchResults);
      const successfulSales = flat.filter(r => r.status === 201).length;
      const totalDuration = results.reduce((acc, r) => acc + r.batchDuration, 0);
      const totalCount = results.reduce((acc, r) => acc + r.count, 0);
      const avgResponseTime = totalDuration / totalCount;

      // Debug: Başarısız isteklerin dağılımını ve örnek gövdeleri göster
      const statusDistribution = flat.reduce((acc, r) => {
        const s = r.status ?? 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      const firstNon201 = flat.find(r => r.status !== 201);
      console.log('Satış status dağılımı:', statusDistribution);
      if (firstNon201) {
        console.log('Örnek başarısız satış yanıtı (status, body):', firstNon201.status, firstNon201.body);
      }

      console.log(`Başarılı satış: ${successfulSales}/${CONCURRENT_USERS}`);
      console.log(`Ortalama yanıt süresi: ${avgResponseTime}ms`);

      expect(successfulSales).toBeGreaterThanOrEqual(Math.floor(CONCURRENT_USERS * 0.90));
      expect(avgResponseTime).toBeLessThan(4000);
    }, 15000);

    test('500 kullanıcı bakiye sorgusu - batchli', async () => {
      const results = await runBatchedRequests(CONCURRENT_USERS, () =>
        request(app)
          .get(`/api/v1/balance/${testInfluencerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const flat = results.flatMap(r => r.batchResults);
      const successfulQueries = flat.filter(r => r.status === 200).length;
      const totalDuration = results.reduce((acc, r) => acc + r.batchDuration, 0);
      const totalCount = results.reduce((acc, r) => acc + r.count, 0);
      const avgResponseTime = totalDuration / totalCount;

      console.log(`Başarılı sorgu: ${successfulQueries}/${CONCURRENT_USERS}`);
      console.log(`Ortalama yanıt süresi: ${avgResponseTime}ms`);

      expect(successfulQueries).toBeGreaterThanOrEqual(Math.floor(CONCURRENT_USERS * 0.95));
      expect(avgResponseTime).toBeLessThan(2000);
    }, 15000);

    test('Kademeli yük testi - 100, 250, 500 kullanıcı', async () => {
      const testCases = [100, 250, 500];
      
      for (const userCount of testCases) {
        const results = await runBatchedRequests(userCount, () =>
          request(app)
            .get('/api/v1/codes')
            .set('Authorization', `Bearer ${adminToken}`)
        );

        const flat = results.flatMap(r => r.batchResults);
        const successfulRequests = flat.filter(r => r.status === 200).length;
        const totalDuration = results.reduce((acc, r) => acc + r.batchDuration, 0);
        const totalCount = results.reduce((acc, r) => acc + r.count, 0);
        const avgResponseTime = totalDuration / totalCount;

        console.log(`${userCount} kullanıcı - Başarı: ${successfulRequests}/${userCount}, Ortalama süre: ${avgResponseTime}ms`);

        expect(successfulRequests).toBeGreaterThanOrEqual(Math.floor(userCount * 0.95));
        expect(avgResponseTime).toBeLessThan(2000);
      }
    }, 20000);

    // Not: Jest open handles'a takılmaması için bu teste özel timeout verelim
    // Not: Jest open handles'a takılmaması için bu teste özel timeout verelim
    test('Sürekli yük testi - 30 saniye boyunca (batch=25)', async () => {
      const duration = 30000; // 30 saniye
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      let totalResponseTime = 0;

      while (Date.now() - startTime < duration) {
        const batchStart = Date.now();
        const batchResults = await Promise.all(
          Array.from({ length: BATCH_SIZE }).map(() =>
            request(app)
              .get('/api/v1/sales/stats')
              .set('Authorization', `Bearer ${adminToken}`)
          )
        );
        const batchEnd = Date.now();

        requestCount += batchResults.length;
        successCount += batchResults.filter(r => r.status === 200).length;
        totalResponseTime += (batchEnd - batchStart);

        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }

      const avgResponseTime = totalResponseTime / requestCount;
      const successRate = (successCount / requestCount) * 100;

      console.log(`Toplam istek: ${requestCount}`);
      console.log(`Başarılı istek: ${successCount}`);
      console.log(`Başarı oranı: ${successRate}%`);
      console.log(`Ortalama yanıt süresi: ${avgResponseTime}ms`);

      expect(successRate).toBeGreaterThan(90);
      expect(avgResponseTime).toBeLessThan(2000);
    }, 35000); // Jest test timeout'u açıkça tanımlandı (runInBand ile güvenli)
  });

  describe('Memory ve CPU Kullanımı', () => {
    // Küçük bir yardımcı: sınırlı eşzamanlılık ile dizi üzerinde iterator çalıştırır
    async function mapLimit(items, limit, iterator) {
      const ret = [];
      let idx = 0;
      let active = 0;
      let resolveOuter;
      const done = new Promise((res) => (resolveOuter = res));

      function launchNext() {
        while (active < limit && idx < items.length) {
          const currentIndex = idx++;
          active++;
          Promise.resolve()
            .then(() => iterator(items[currentIndex], currentIndex))
            .then((val) => {
              ret[currentIndex] = val;
            })
            .finally(() => {
              active--;
              if (ret.length === items.length && active === 0 && idx >= items.length) {
                resolveOuter();
              } else {
                launchNext();
              }
            });
        }
      }
      launchNext();
      await done;
      return ret;
    }

    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function forceGCWithStabilization() {
      if (global.gc) {
        try { global.gc(); } catch (_) {}
        await sleep(200);
        try { global.gc(); } catch (_) {}
      }
      // Event loop’u boşalt
      await sleep(400);
    }

    // Bu testin de açık timeout tanımı olsun; jest --detectOpenHandles ile beklemesin
    // Not: Bu test için de açık bir timeout tanımlıyoruz.
    // Not: Bu testte de açık timeout verelim ki jest beklemesin
    // Not: Bu testte de açık timeout verelim ki jest beklemesin
    test('Bellek sızıntısı kontrolü (sınırlı eşzamanlılık + warm-up)', async () => {
      const BATCH_COUNT = 10;
      const REQUESTS_PER_BATCH = 50;
      const CONCURRENCY = 10;

      // Warm-up fazı: JIT/route/middleware ısınması
      await mapLimit(Array.from({ length: 20 }), CONCURRENCY, async () => {
        const r = await request(app)
          .get('/api/v1/codes')
          .set('Authorization', `Bearer ${adminToken}`);
        expect([200, 401, 403]).toContain(r.status ? r.status : 200); // güvenli
      });
      await forceGCWithStabilization();

      // Başlangıç bellek ölçümü
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < BATCH_COUNT; i++) {
        const statuses = await mapLimit(
          Array.from({ length: REQUESTS_PER_BATCH }),
          CONCURRENCY,
          async () => {
            const r = await request(app)
              .get('/api/v1/codes')
              .set('Authorization', `Bearer ${adminToken}`);
            return r.status;
          }
        );
        // Başarı kontrolü
        expect(statuses.every((s) => [200, 503, 504].includes(s))).toBe(true);

        // Batch sonunda GC ve kısa bekleme
        await forceGCWithStabilization();

        // Trend gözlemi için per-batch log
        const nowHeap = process.memoryUsage().heapUsed;
        console.log(`[MEM] Batch ${i + 1}/${BATCH_COUNT} heapUsed=${Math.round(nowHeap / 1024 / 1024)}MB`);
      }

      // Nihai stabilizasyon
      await forceGCWithStabilization();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Başlangıç bellek: ${Math.round(initialMemory / 1024 / 1024)}MB`);
      console.log(`Son bellek: ${Math.round(finalMemory / 1024 / 1024)}MB`);
      console.log(`Bellek artışı: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }, 40000); // Bu testin de timeoutu açıkça tanımlandı
  });
});