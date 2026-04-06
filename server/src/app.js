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
const cameraRoutes        = require('./routes/camera');

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
app.use('/api/camera',        cameraRoutes);

// ── Camera popout viewer page ──────────────────────────────────
app.get('/camera-popout', (req, res) => {
  const { name = 'Camera', streamUrl = '' } = req.query;
  const safeName = name.replace(/[<>"]/g, '');
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><title>${safeName} \u2014 Camera</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;background:#000}
body{display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:-apple-system,sans-serif}
#bar{height:36px;background:#111;display:flex;align-items:center;padding:0 14px;gap:10px;flex-shrink:0;-webkit-app-region:drag;user-select:none}
#badge{background:#e53935;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;letter-spacing:.06em}
#title{color:#fff;font-size:13px;font-weight:600}
#info{color:#666;font-size:11px;margin-left:auto}
#wrap{flex:1;display:flex;align-items:center;justify-content:center}
canvas{max-width:100%;max-height:100%;object-fit:contain}
</style>
</head><body>
<div id="bar"><span id="badge">LIVE</span><span id="title">${safeName}</span><span id="info">Connecting...</span></div>
<div id="wrap"><canvas id="c"></canvas></div>
<script>
var canvas=document.getElementById('c'),info=document.getElementById('info');
var dec=new TextDecoder(),buf=new Uint8Array(0),frames=0;
var src=decodeURIComponent('${encodeURIComponent(streamUrl)}');
function cat(a,b){var n=new Uint8Array(a.length+b.length);n.set(a);n.set(b,a.length);return n;}
function idx(h,n,f){f=f||0;o:for(var i=f;i<=h.length-n.length;i++){for(var j=0;j<n.length;j++)if(h[i+j]!==n[j])continue o;return i;}return -1;}
var D=new Uint8Array([13,10,13,10]);
fetch(src).then(function(r){
  if(!r.ok){info.textContent='HTTP '+r.status;return;}
  info.textContent='0 frames';
  var rd=r.body.getReader();
  (function read(){rd.read().then(function(d){
    if(d.done){info.textContent='Stream ended';return;}
    buf=cat(buf,d.value);
    for(;;){var he=idx(buf,D);if(he===-1)break;
      var ht=dec.decode(buf.slice(0,he));
      var m=ht.match(/Content-Length:\\s*(\\d+)/i);if(!m){buf=buf.slice(he+4);continue;}
      var fl=parseInt(m[1]),fs=he+4,fe=fs+fl;if(buf.length<fe)break;
      var fb=buf.slice(fs,fe);buf=buf.slice(fe);
      createImageBitmap(new Blob([fb],{type:'image/jpeg'})).then(function(bm){
        canvas.width=bm.width;canvas.height=bm.height;
        canvas.getContext('2d').drawImage(bm,0,0);bm.close();
        info.textContent=(++frames)+' frames';
      });}
    read();
  }).catch(function(e){info.textContent='Lost: '+e.message;});})();
}).catch(function(e){info.textContent='Error: '+e.message;});
<\/script></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

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
