const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Test ortamında limiter'lar skip ile devre dışı kalacak
const isTestEnvironment = process.env.NODE_ENV === 'test';

let redisClient = null;
let isRedisAvailable = false;

if (!isTestEnvironment) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
      isRedisAvailable = false;
    });

    // Bağlantı testi
    redisClient.ping().then(() => {
      isRedisAvailable = true;
    }).catch(() => {
      isRedisAvailable = false;
    });
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    isRedisAvailable = false;
  }
}

// Ortak opsiyonları oluştur, Redis varsa store ekle
function buildLimiterOptions(baseOptions) {
  const opts = { ...baseOptions };
  if (!isTestEnvironment && isRedisAvailable) {
    opts.store = new RedisStore({
      client: redisClient,
      prefix: `rl:${baseOptions.prefix || 'default'}:`,
    });
  }
  delete opts.prefix; // Redis dışı durumda gerek yok
  return opts;
}

// Genel rate limiter
const generalLimiter = rateLimit(buildLimiterOptions({
  prefix: 'general',
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnvironment, // Test ortamında tamamen atla
}));

// API rate limiter
const apiLimiter = rateLimit(buildLimiterOptions({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'API rate limit exceeded, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health' || isTestEnvironment,
}));

// Auth endpointleri için limiter
const authLimiter = rateLimit(buildLimiterOptions({
  prefix: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnvironment,
}));

// Influencer oluşturma limiter
const influencerLimiter = rateLimit(buildLimiterOptions({
  prefix: 'influencer',
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10,
  message: {
    error: 'Too many influencer creation attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnvironment,
}));

// Satış raporu limiter
const saleReportLimiter = rateLimit(buildLimiterOptions({
  prefix: 'saleReport',
  windowMs: 5 * 60 * 1000, // 5 dakika
  max: 50,
  message: {
    error: 'Too many sale report submissions, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnvironment,
}));

// Graceful shutdown handler
function closeRedisConnection() {
  if (redisClient && isRedisAvailable) {
    redisClient.disconnect();
    console.log('Redis connection closed gracefully');
  }
}

// Uygulama kapanışında Redis'i kapat
process.on('SIGTERM', closeRedisConnection);
process.on('SIGINT', closeRedisConnection);

module.exports = {
  generalLimiter,
  apiLimiter,
  authLimiter,
  influencerLimiter,
  saleReportLimiter,
  closeRedisConnection,
  isRedisAvailable
};