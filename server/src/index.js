require('dotenv').config();

// ── Runtime env fix ────────────────────────────────────────────────────────
// If JWT_SECRET is still the placeholder, set a real one so tokens work
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('REPLACE')) {
  process.env.JWT_SECRET = '4ee4d25a3967128b3456848dece9a438e4b848a9898ae9056caecf23f3f1b75aa0e2f0d0cc0088d25050f23499f4822ec7ecb1081d9d7aa1044fae4f3dbf763b';
}
// Ensure auth limiter can't block logins on Docker bridge network
process.env.TRUST_PROXY = '1';
// ───────────────────────────────────────────────────────────────────────────
const http = require('http');
const app = require('./app');
const { initSocket } = require('./services/socket');
const { runMigrations } = require('./db/migrate');
const logger = require('./services/logger');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Run DB migrations before accepting connections
    logger.info('Running database migrations...');
    runMigrations();
    logger.info('Migrations complete.');

    const server = http.createServer(app);

    // Attach Socket.io to the same HTTP server
    initSocket(server);

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`PrintFlow server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Start Bambu printer connections after socket is ready
    server.on('listening', async () => {
      try {
        const BambuManager = require('./services/bambu/BambuManager');
        await BambuManager.startAll();
      } catch (err) {
        logger.warn('BambuManager startup warning:', err.message);
      }
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      try { require('./services/bambu/BambuManager').stopAll(); } catch {}
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
