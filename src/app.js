require('dotenv').config() // Ortam değişkenlerini yükle

/*
  Bu dosya: Express uygulamasını başlatır ve global middleware/route zincirini kurar.
  Not: Güvenlik için boot aşamasında kritik ortam değişkenleri kontrol edilir.
  Sertleştirmeler:
  - helmet alt politikaları (CSP reportOnly, HSTS prod, noSniff vb.)
  - CORS whitelist (CORS_ORIGINS) – prod’da zorunlu, dev’de gevşek
  - Rate limiter ve global hata yakalayıcı
  - Not: Redis üretimde zorunlu olmalıdır (rate limit için); bu dosyada akışı bozmadan yorum olarak belirtilmiştir.
*/
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const knex = require('./db/sqlite')

// Run migrations on startup (development and production)
// Production ortamında da migration'ların çalıştırılması için
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  knex.migrate.latest()
    .then(() => {
      console.log('Migrations ran successfully');
    })
    .catch(err => {
      console.error('Error running migrations:', err);
    });
}

// Middleware imports
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler')
const { generalLimiter, apiLimiter, authLimiter, authShortLimiter, authLongLimiter } = require('./middleware/rateLimiter')
const { authenticateToken, requireAdmin } = require('./middleware/auth')

function createApp() {
  // Boot-time env kontrolleri (test dahil)
  // JWT_SECRET zorunlu – yoksa fail-fast
  if (!process.env.JWT_SECRET) {
    console.error('HATA: JWT_SECRET tanımlı değil. Lütfen ortam değişkenini ayarlayın.')
    process.exit(1)
  }
  // Opsiyoneller: Uyarı ver, çıkma
  if (!process.env.CORS_ORIGINS && process.env.NODE_ENV === 'production') {
    console.warn('UYARI: Production ortamında CORS_ORIGINS tanımlı değil. Whitelist yaklaşımı önerilir.')
  }
  // Not: Redis üretimde zorunlu olmalıdır. rateLimiter.js içinde mevcut; burada davranış değiştirmiyoruz.

  const app = express()

  // Security middleware – helmet sertleştirme
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ['\'self\''],
      },
      reportOnly: true, // Türkçe: CSP ihlallerini raporla, engelleme yapma (gözlem aşaması)
    },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false, // ~180 gün
    noSniff: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }))

  // CORS whitelist – Türkçe: Production’da whitelist zorunlu; development/test’te gevşek bırakılabilir
  // CORS ayarları - hem development hem production için aynı esnek ayarları kullan
  // Bu şekilde admin tarafı etkilenmez
  const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5002'], // Frontend portlarına izin ver
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }
  app.use(cors(corsOptions))

  app.use(express.json())
  app.use(cookieParser())

  // Request logging ve rate limiting
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger)
    // Genel ve API limiter
    app.use(generalLimiter)
    app.use('/api/v1', apiLimiter)
    // Auth altında login uçlarına ek katman (mevcut authLimiter ile birlikte)
    app.use('/api/v1/auth', authLimiter)
    app.use('/api/v1/auth', authShortLimiter)
    app.use('/api/v1/auth', authLongLimiter)
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  })

  // API routes - support both versioned and non-versioned endpoints
  const applyRouter = require('./routes/apply')
  const saleRouter = require('./routes/sale')
  const influencerRouter = require('./routes/influencer')
  const influencerDashboardRouter = require('./routes/influencer-dashboard')
  const contractRouter = require('./routes/contract')
  const codesRouter = require('./routes/codes')
  const balanceRouter = require('./routes/balance')
  const messagesRouter = require('./routes/messages')
  const alertsRouter = require('./routes/alerts')
 const payoutsRouter = require('./routes/payouts')
  const authRouter = require('./routes/auth')
  const commissionsRouter = require('./routes/commissions')
  const settingsRouter = require('./routes/settings')
  const influencerSettingsRouter = require('./routes/influencer-settings')
  const influencerSummaryRouter = require('./routes/influencer-summary')
  const influencerPerformanceRouter = require('./routes/influencer-performance')

  // Mount routers for both /api and /api/v1
  const apiBases = ['/api', '/api/v1']

  apiBases.forEach(base => {
    app.use(base, saleRouter)
    app.use(`${base}/auth`, authRouter)

    // Mount other routes
    app.use(`${base}/apply`, authenticateToken, applyRouter)
    app.use(`${base}/influencers`, authenticateToken, requireAdmin, influencerRouter)
    // Önce daha spesifik route'ları mount et
    app.use(`${base}/influencer/summary`, authenticateToken, influencerSummaryRouter)
    app.use(`${base}/influencer-summary`, authenticateToken, influencerSummaryRouter)
    // Sonra genel influencer route'larını mount et
    app.use(`${base}/influencer`, authenticateToken, influencerRouter)
    app.use(`${base}/influencer/dashboard`, authenticateToken, influencerDashboardRouter)
    app.use(`${base}/influencer/performance`, authenticateToken, influencerPerformanceRouter)
    app.use(`${base}/influencer`, authenticateToken, influencerSettingsRouter)
    app.use(`${base}/contracts`, contractRouter)
    app.use(`${base}/codes`, authenticateToken, codesRouter)
    app.use(`${base}/balance`, authenticateToken, balanceRouter)
    app.use(`${base}/messages`, authenticateToken, messagesRouter)
    app.use(`${base}/alerts`, authenticateToken, alertsRouter)
    app.use(`${base}/payouts`, authenticateToken, payoutsRouter)
    app.use(`${base}/commissions`, authenticateToken, commissionsRouter)
    app.use(`${base}/admin/settings`, authenticateToken, requireAdmin, settingsRouter)
  })

  // Error handling
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

// Eğer dosya doğrudan çalıştırılırsa, dinlemeyi başlat ve portu logla
if (require.main === module) {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5003 // Varsayılan portu 5003 olarak ayarla
  const app = createApp()
  app.listen(PORT, () => {
    console.log(`[backend] Server is listening on http://localhost:${PORT}`)
  })
}

module.exports = createApp