const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const knex = require('./db/sqlite');

// Middleware imports
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');
const { generalLimiter, apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/auth');

function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Request logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
    // Rate limiting
    app.use(generalLimiter);
    app.use('/api/v1', apiLimiter);
    app.use('/api/v1/auth', authLimiter);
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
  app.use('/api/v1', require('./routes/auth'));
  app.use('/api/v1', require('./routes/apply'));
  // Satış kaydetme (POST /sale) public olmalı; GET satış uçları route içinde korunacak
  app.use('/api/v1', require('./routes/sale'));

  // 2) Korumalı uçlar (auth gerektirir)
  app.use('/api/v1', authenticateToken, require('./routes/codes'));
  app.use('/api/v1', authenticateToken, require('./routes/balance'));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;