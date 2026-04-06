const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./services/logger');

const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const filamentRoutes = require('./routes/filament');
const partsRoutes   = require('./routes/parts');
const orderRoutes   = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes        = require('./routes/audit');
const printerRoutes      = require('./routes/printers');
const transactionRoutes  = require('./routes/transactions');
const bambuRoutes        = require('./routes/bambu');
const bambuCloudRoutes   = require('./routes/bambuCloud');
const shippingRoutes     = require('./routes/shipping');
const settingsRoutes     = require('./routes/settings');
const shopifyRoutes      = require('./routes/shopify');
const updatesRoutes       = require('./routes/updates');
const jobsRoutes          = require('./routes/jobs');
const customersRoutes     = require('./routes/customers');
const notificationsRoutes = require('./routes/notifications');

const app = express();

// ── Security headers ────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (desktop Electron app, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP logging ────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Rate limiting ───────────────────────────────────────────────
// NOTE: Auth rate limiter removed — Docker bridge network assigns the same
// IP to all clients, causing false positives that block legitimate logins.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/filament',  filamentRoutes);
app.use('/api/parts',     partsRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit',     auditRoutes);
app.use('/api/printers',      printerRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/bambu',         bambuRoutes);
app.use('/api/bambu/cloud',   bambuCloudRoutes);
app.use('/api/shipping',      shippingRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/shopify',       shopifyRoutes);
app.use('/updates',           updatesRoutes);
app.use('/api/jobs',          jobsRoutes);
app.use('/api/customers',     customersRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), version: '1.0.0' });
});

// ── 404 ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
