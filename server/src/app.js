const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./services/logger');
const { getDb } = require('./db/connection');

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
const backupRoutes         = require('./routes/backup');
const octoprintRoutes      = require('./routes/octoprint');
const klipperRoutes        = require('./routes/klipper');
const emailRoutes          = require('./routes/email');
const portalRoutes         = require('./routes/portal');
const recurringRoutes      = require('./routes/recurring');
const crashRoutes          = require('./routes/crash');

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
app.use('/api/backup',        backupRoutes);
app.use('/api/octoprint',     octoprintRoutes);
app.use('/api/klipper',       klipperRoutes);
app.use('/api/email',         emailRoutes);
app.use('/api/portal',        portalRoutes);
app.use('/api/recurring',     recurringRoutes);
app.use('/api/crash',         crashRoutes);

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

// ── Customer order tracking portal ────────────────────────────
// Public page — no auth. Customers visit /track or /track?order=1001
app.get('/track', (req, res) => {
  const db = getDb();
  let biz = { name: 'PrintFlow', email: '', phone: '' };
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'company_config'").get();
    if (row?.value) { const c = JSON.parse(row.value); biz = { name: c.name||'PrintFlow', email: c.email||'', phone: c.phone||'' }; }
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Order Tracking — ${biz.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a14;color:#e8e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:40px 20px}
  .logo{width:48px;height:48px;border-radius:14px;background:#0071e3;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 4px 24px rgba(0,113,227,0.4)}
  .logo svg{width:28px;height:28px}
  h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:6px}
  .sub{font-size:14px;color:#888;text-align:center;margin-bottom:32px}
  .card{background:#12121e;border:0.5px solid #2a2a3a;border-radius:16px;padding:28px;width:100%;max-width:560px;margin-bottom:16px}
  .row{display:flex;gap:10px;margin-bottom:0}
  input{flex:1;background:#1a1a28;border:0.5px solid #2a2a3a;border-radius:10px;padding:12px 16px;font-size:16px;color:#e8e8f0;font-family:monospace;outline:none;transition:border-color 0.15s}
  input:focus{border-color:#0071e3}
  input::placeholder{color:#444;font-family:-apple-system,sans-serif;font-size:14px}
  button{background:#0071e3;color:#fff;border:none;border-radius:10px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.15s}
  button:hover{background:#0077ed}
  button:disabled{background:#333;color:#666;cursor:default}
  .err{background:rgba(255,59,48,0.1);border:0.5px solid rgba(255,59,48,0.3);border-radius:10px;padding:14px 18px;color:#ff3b30;font-size:14px;margin-top:14px}
  .result{display:none}
  .order-num{font-family:monospace;font-size:22px;font-weight:800;color:#0071e3}
  .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;margin-top:8px}
  .badge.active{background:rgba(0,113,227,0.15);color:#0071e3}
  .badge.done{background:rgba(48,209,88,0.15);color:#30d158}
  .badge.cancelled{background:rgba(255,59,48,0.15);color:#ff3b30}
  .desc{margin-top:16px;padding:12px 14px;background:#1a1a28;border-radius:10px;font-size:14px;line-height:1.6;color:#b0b0c0}
  .steps{display:flex;align-items:flex-start;justify-content:space-between;margin:24px 0;position:relative}
  .steps::before{content:'';position:absolute;top:18px;left:6%;right:6%;height:2px;background:#2a2a3a;z-index:0}
  .step{display:flex;flex-direction:column;align-items:center;gap:6px;z-index:1;flex:1}
  .step-dot{width:36px;height:36px;border-radius:50%;border:2px solid #2a2a3a;background:#12121e;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all 0.3s}
  .step-dot.done{border-color:#0071e3;background:#0071e3}
  .step-dot.future{border-color:#2a2a3a;background:#12121e}
  .step-label{font-size:9px;font-weight:600;color:#555;text-align:center;max-width:60px;line-height:1.3;text-transform:uppercase;letter-spacing:0.04em}
  .step-label.done{color:#0071e3}
  .progress-line{position:absolute;top:18px;left:6%;height:2px;background:#0071e3;z-index:0;transition:width 0.5s ease;border-radius:2px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
  .meta-item{background:#1a1a28;border-radius:10px;padding:12px 14px}
  .meta-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;margin-bottom:4px}
  .meta-value{font-size:14px;font-weight:600}
  .tracking-box{margin-top:14px;padding:14px 16px;background:rgba(0,113,227,0.08);border:0.5px solid rgba(0,113,227,0.25);border-radius:10px}
  .tracking-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#0071e3;margin-bottom:6px}
  .tracking-num{font-family:monospace;font-size:16px;font-weight:700}
  .tracking-carrier{font-size:12px;color:#888;margin-top:2px}
  .contact{text-align:center;font-size:13px;color:#555;margin-top:8px}
  .contact a{color:#0071e3;text-decoration:none}
  @media(max-width:480px){.meta{grid-template-columns:1fr}.steps{gap:0}.step-label{display:none}}
</style>
</head>
<body>
<div class="logo">
  <svg viewBox="0 0 80 80" fill="none"><rect x="8" y="12" width="6" height="40" rx="3" fill="white" opacity="0.6"/><rect x="66" y="12" width="6" height="40" rx="3" fill="white" opacity="0.6"/><rect x="8" y="10" width="64" height="8" rx="4" fill="white" opacity="0.8"/><rect x="31" y="12" width="18" height="11" rx="3" fill="white"/><path d="M37 23 L40 30 L43 23 Z" fill="white"/><rect x="27" y="48" width="26" height="5" rx="2" fill="white" opacity="0.7"/><rect x="10" y="57" width="60" height="8" rx="3" fill="white" opacity="0.7"/></svg>
</div>
<h1>${biz.name}</h1>
<p class="sub">Enter your order number to check your print status</p>

<div class="card">
  <div class="row">
    <input id="orderInput" type="text" placeholder="Order number e.g. 1001" autocomplete="off" autocorrect="off" spellcheck="false" />
    <button id="trackBtn" onclick="lookup()">Track</button>
  </div>
  <div id="errBox" class="err" style="display:none"></div>
</div>

<div id="result" class="card result">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;margin-bottom:4px">Order</div>
      <div class="order-num" id="rOrderNum"></div>
    </div>
    <div id="rBadge" class="badge active"></div>
  </div>

  <div id="stepsWrap" style="position:relative;margin:24px 0">
    <div class="steps" id="stepsRow"></div>
    <div class="progress-line" id="progressLine"></div>
  </div>

  <div id="cancelledNote" style="display:none;padding:12px 14px;background:rgba(255,59,48,0.08);border-radius:10px;color:#ff3b30;font-size:13px;margin-bottom:12px">
    This order has been cancelled. Please contact us if you have questions.
  </div>

  <div class="desc" id="rDesc"></div>

  <div class="meta">
    <div class="meta-item"><div class="meta-label">Order Placed</div><div class="meta-value" id="rDate"></div></div>
    <div class="meta-item" id="rDueWrap"><div class="meta-label">Due Date</div><div class="meta-value" id="rDue"></div></div>
  </div>

  <div id="rTrackingWrap" class="tracking-box" style="display:none">
    <div class="tracking-label">📦 Tracking</div>
    <div class="tracking-num" id="rTracking"></div>
    <div class="tracking-carrier" id="rCarrier"></div>
  </div>

  <div id="rNotesWrap" style="display:none;margin-top:14px;padding:12px 14px;background:#1a1a28;border-radius:10px;font-size:13px;color:#888;line-height:1.6">
    <span style="font-weight:700;color:#666;display:block;margin-bottom:4px">Notes</span>
    <span id="rNotes"></span>
  </div>
</div>

${biz.email||biz.phone ? `<p class="contact">Questions? ${biz.email?`<a href="mailto:${biz.email}">${biz.email}</a>`:''} ${biz.phone?`&middot; ${biz.phone}`:''}</p>` : ''}

<script>
const STEPS = [
  {key:'new',      label:'Received',  icon:'📋'},
  {key:'queued',   label:'In Queue',   icon:'⏳'},
  {key:'printing', label:'Printing',   icon:'🖨️'},
  {key:'qc',       label:'QC Check',   icon:'🔍'},
  {key:'packed',   label:'Packed',     icon:'📦'},
  {key:'shipped',  label:'Shipped',    icon:'🚚'},
  {key:'paid',     label:'Complete',   icon:'✅'},
];
const STATUS_STEP = {
  new:0, queued:1, quoted:1, confirmed:1,
  printing:2, printed:2, 'post-processing':2,
  qc:3, packed:4, shipped:5, delivered:6, paid:6, cancelled:-1
};

function fmt(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});}

// Auto-fill from ?order= query param
const params=new URLSearchParams(location.search);
const pre=params.get('order');
if(pre){document.getElementById('orderInput').value=pre;}

document.getElementById('orderInput').addEventListener('keydown',function(e){if(e.key==='Enter')lookup();});

async function lookup(){
  const raw=document.getElementById('orderInput').value.trim().replace(/^#+/,'');
  if(!raw)return;
  document.getElementById('errBox').style.display='none';
  document.getElementById('result').style.display='none';
  const btn=document.getElementById('trackBtn');
  btn.disabled=true; btn.textContent='Tracking…';
  try{
    const r=await fetch('/api/portal/order/%23'+encodeURIComponent(raw));
    const d=await r.json();
    if(!r.ok){showErr(d.error||'Order not found.');return;}
    showResult(d);
  }catch(e){showErr('Could not reach server. Try again.');}
  finally{btn.disabled=false;btn.textContent='Track';}
}

function showErr(msg){
  const b=document.getElementById('errBox');
  b.textContent=msg; b.style.display='block';
}

function showResult(o){
  document.getElementById('rOrderNum').textContent=o.order_number;
  document.getElementById('rDesc').textContent=o.description;
  document.getElementById('rDate').textContent=fmt(o.created_at);

  const dueWrap=document.getElementById('rDueWrap');
  if(o.due_date){document.getElementById('rDue').textContent=fmt(o.due_date);dueWrap.style.display='';}else{dueWrap.style.display='none';}

  const badge=document.getElementById('rBadge');
  badge.textContent=o.status_label;
  badge.className='badge '+(o.status==='cancelled'?'cancelled':o.status==='paid'?'done':'active');

  const cancelled=o.status==='cancelled';
  document.getElementById('cancelledNote').style.display=cancelled?'':'none';

  // Progress steps
  const step=STATUS_STEP[o.status]??0;
  const row=document.getElementById('stepsRow');
  row.innerHTML='';
  STEPS.forEach(function(s,i){
    const div=document.createElement('div'); div.className='step';
    const dot=document.createElement('div'); dot.className='step-dot '+(i<=step&&!cancelled?'done':'future');
    dot.textContent=i<=step&&!cancelled?s.icon:'';
    const lbl=document.createElement('div'); lbl.className='step-label '+(i<=step&&!cancelled?'done':'');
    lbl.textContent=s.label;
    div.appendChild(dot); div.appendChild(lbl); row.appendChild(div);
  });
  document.getElementById('stepsWrap').style.display=cancelled?'none':'';
  const pct=cancelled?0:Math.min(100,(step/(STEPS.length-1))*88);
  document.getElementById('progressLine').style.width=pct+'%';

  // Tracking
  const tw=document.getElementById('rTrackingWrap');
  if(o.tracking_number){document.getElementById('rTracking').textContent=o.tracking_number;document.getElementById('rCarrier').textContent=o.carrier?'Carrier: '+o.carrier:'';tw.style.display='';}else{tw.style.display='none';}

  // Notes
  const nw=document.getElementById('rNotesWrap');
  if(o.notes){document.getElementById('rNotes').textContent=o.notes;nw.style.display='';}else{nw.style.display='none';}

  document.getElementById('result').style.display='block';
}

// Auto-lookup if order pre-filled
if(pre)lookup();
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
