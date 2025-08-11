require('dotenv').config(); // Ortam değişkenlerini yükle

/*
  Bu dosya: Express uygulamasını başlatır ve global middleware/route zincirini kurar.
  Not: Güvenlik için boot aşamasında kritik ortam değişkenleri kontrol edilir.
  Sertleştirmeler:
  - helmet alt politikaları (CSP reportOnly, HSTS prod, noSniff vb.)
  - CORS whitelist (CORS_ORIGINS) – prod’da zorunlu, dev’de gevşek
  - Rate limiter ve global hata yakalayıcı
  - Not: Redis üretimde zorunlu olmalıdır (rate limit için); bu dosyada akışı bozmadan yorum olarak belirtilmiştir.
*/
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const knex = require('./db/sqlite');

// Middleware imports
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');
const { generalLimiter, apiLimiter, authLimiter, authShortLimiter, authLongLimiter } = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/auth');

function createApp() {
  // Boot-time env kontrolleri (test dahil)
  // JWT_SECRET zorunlu – yoksa fail-fast
  if (!process.env.JWT_SECRET) {
    console.error('HATA: JWT_SECRET tanımlı değil. Lütfen ortam değişkenini ayarlayın.');
    process.exit(1);
  }
  // Opsiyoneller: Uyarı ver, çıkma
  if (!process.env.CORS_ORIGINS && process.env.NODE_ENV === 'production') {
    console.warn('UYARI: Production ortamında CORS_ORIGINS tanımlı değil. Whitelist yaklaşımı önerilir.');
  }
  // Not: Redis üretimde zorunlu olmalıdır. rateLimiter.js içinde mevcut; burada davranış değiştirmiyoruz.

  const app = express();

  // Security middleware – helmet sertleştirme
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
      },
      reportOnly: true, // Türkçe: CSP ihlallerini raporla, engelleme yapma (gözlem aşaması)
    },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false, // ~180 gün
    noSniff: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));

  // CORS whitelist – Türkçe: Production’da whitelist zorunlu; development/test’te gevşek bırakılabilir
  const isProd = process.env.NODE_ENV === 'production';
  const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const corsOptions = isProd
    ? {
        origin: (origin, callback) => {
          // origin yoksa (örn. curl) yalnızca prod’da reddet
          if (!origin) return callback(new Error('CORS: Origin eksik'), false);
          if (corsOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('CORS: Origin izinli değil'), false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
      }
    : {
        origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4001'], // Frontend portlarına izin ver
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      };
  app.use(cors(corsOptions));

  app.use(express.json());

  // Request logging ve rate limiting
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
    // Genel ve API limiter
    app.use(generalLimiter);
    app.use('/api/v1', apiLimiter);
    // Auth altında login uçlarına ek katman (mevcut authLimiter ile birlikte)
    app.use('/api/v1/auth', authLimiter);
    app.use('/api/v1/auth', authShortLimiter);
    app.use('/api/v1/auth', authLongLimiter);
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API routes
  // ÖNEMLİ SIRA: Public uçlar önce tanımlanır; aksi halde global/auth etkilenebilir.
  // 1) Public uçlar
  const authRouter = require('./routes/auth');
  app.use('/api/v1', authRouter);
  // Ayrıca UI tarafı doğrudan kök path’e (prefixsiz) çağrı yaparsa 404 olmasın diye alias ekle
  app.use('/', authRouter);
  
  app.use('/api/v1', authenticateToken, require('./routes/apply')); // apply router'ı authenticateToken ile korundu
  // Satış kaydetme (POST /sale) public; GET satış uçları route içinde korunur
  app.use('/api/v1', require('./routes/sale'));
  // Influencer public ve korumalı uçları: hem /api/v1/influencers altında hem de köke alias
  const influencerRouter = require('./routes/influencer');
  app.use('/api/v1/influencers', influencerRouter);
  app.use('/influencers', influencerRouter);
  
  // Sözleşme rotası (public erişim)
  const contractRouter = require('./routes/contract');
  app.use('/api/v1/contracts', contractRouter);
  
  // 2) Korumalı uçlar (auth gerektirir)
  const codesRouter = require('./routes/codes');
  const balanceRouter = require('./routes/balance');
  const messagesRouter = require('./routes/messages');
  const alertsRouter = require('./routes/alerts'); // Yeni sistem uyarıları rotası
  app.use('/api/v1', authenticateToken, codesRouter);
  // Balance router altında artık admin için /balance/:influencerId/summary da mevcut
  app.use('/api/v1', authenticateToken, balanceRouter);
  app.use('/api/v1', authenticateToken, messagesRouter);
  app.use('/api/v1/alerts', authenticateToken, alertsRouter); // Sistem uyarıları rotasını ekle

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
 
// Eğer dosya doğrudan çalıştırılırsa, dinlemeyi başlat ve portu logla
if (require.main === module) {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5003; // Varsayılan portu 5003 olarak ayarla
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[backend] Server is listening on http://localhost:${PORT}`);
  });
}
 
module.exports = createApp;