// routes/octoprint.js — OctoPrint API polling for non-Bambu printers
'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/connection');
const { broadcast } = require('../services/socket');
const logger = require('../services/logger');

// In-memory state cache keyed by printer serial
const states = {};
const pollers = {};

function mapStatus(octoState) {
  if (!octoState) return 'offline';
  const flags = octoState.flags || {};
  if (flags.printing)   return 'printing';
  if (flags.pausing)    return 'paused';
  if (flags.paused)     return 'paused';
  if (flags.cancelling) return 'paused';
  if (flags.ready)      return 'idle';
  if (flags.error)      return 'error';
  if (flags.closedOrError) return 'offline';
  return 'offline';
}

async function pollOctoPrint(printer) {
  const base = `http://${printer.ip_address}`;
  const key  = printer.access_code; // OctoPrint uses API key in access_code field
  const headers = { 'X-Api-Key': key, 'Content-Type': 'application/json' };

  try {
    const [stateRes, jobRes, tempRes] = await Promise.all([
      fetch(`${base}/api/printer/command`, { method: 'GET', headers }).catch(() => null), // wrong but we use below
      fetch(`${base}/api/printer`, { headers, signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/api/job`,     { headers, signal: AbortSignal.timeout(5000) }),
    ]);

    const printerData = stateRes?.ok ? await stateRes.json().catch(() => ({})) : {};
    const printer2    = jobRes?.ok   ? await jobRes.json().catch(() => ({}))   : {};
    const jobData     = tempRes?.ok  ? await tempRes.json().catch(() => ({}))  : {};

    // Re-fetch properly
    const [pd, jd] = await Promise.all([
      fetch(`${base}/api/printer`, { headers, signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${base}/api/job`,     { headers, signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]);

    const temps  = pd.temperature || {};
    const state  = pd.state || {};
    const job    = jd.job || {};
    const prog   = jd.progress || {};

    const liveState = {
      serial:        printer.serial,
      status:        mapStatus(state),
      nozzle_temp:   Math.round(temps.tool0?.actual || 0),
      nozzle_target: Math.round(temps.tool0?.target  || 0),
      bed_temp:      Math.round(temps.bed?.actual     || 0),
      bed_target:    Math.round(temps.bed?.target     || 0),
      chamber_temp:  0,
      print_pct:     Math.round((prog.completion || 0)),
      eta_min:       prog.printTimeLeft ? Math.round(prog.printTimeLeft / 60) : 0,
      layer_num:     0,
      total_layer_num: 0,
      filename:      job.file?.name || '',
      connection_type: 'octoprint',
      source:        'octoprint',
    };

    states[printer.serial] = liveState;
    broadcast('printer:status', liveState);
  } catch (err) {
    const offline = {
      serial: printer.serial, status: 'offline',
      nozzle_temp: 0, bed_temp: 0, print_pct: 0,
      connection_type: 'octoprint', source: 'octoprint',
    };
    states[printer.serial] = offline;
    broadcast('printer:status', offline);
  }
}

function startPoller(printer) {
  if (pollers[printer.serial]) return;
  logger.info(`[OctoPrint] Starting poller for ${printer.name} (${printer.ip_address})`);
  pollOctoPrint(printer);
  pollers[printer.serial] = setInterval(() => pollOctoPrint(printer), 8000);
}

function stopPoller(serial) {
  if (pollers[serial]) {
    clearInterval(pollers[serial]);
    delete pollers[serial];
    delete states[serial];
    logger.info(`[OctoPrint] Stopped poller for ${serial}`);
  }
}

function startAllPollers() {
  const db = getDb();
  const printers = db.prepare(
    "SELECT * FROM printers WHERE is_active = 1 AND connection_type = 'octoprint'"
  ).all();
  printers.forEach(p => startPoller(p));
}

// GET /api/octoprint/status — all OctoPrint printer states
router.get('/status', authenticate, (req, res) => {
  res.json(states);
});

// GET /api/octoprint/status/:serial
router.get('/status/:serial', authenticate, (req, res) => {
  const state = states[req.params.serial];
  if (!state) return res.status(404).json({ error: 'Printer not found or not connected' });
  res.json(state);
});

// POST /api/octoprint/connect/:serial
router.post('/connect/:serial', authenticate, (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  startPoller(printer);
  res.json({ message: `Polling started for ${printer.name}` });
});

// POST /api/octoprint/:serial/pause
router.post('/:serial/pause', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/api/job`, {
      method: 'POST',
      headers: { 'X-Api-Key': printer.access_code, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'pause', action: 'pause' }),
      signal: AbortSignal.timeout(5000),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/octoprint/:serial/resume
router.post('/:serial/resume', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/api/job`, {
      method: 'POST',
      headers: { 'X-Api-Key': printer.access_code, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'pause', action: 'resume' }),
      signal: AbortSignal.timeout(5000),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/octoprint/:serial/cancel
router.post('/:serial/cancel', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/api/job`, {
      method: 'POST',
      headers: { 'X-Api-Key': printer.access_code, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'cancel' }),
      signal: AbortSignal.timeout(5000),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.startAllPollers = startAllPollers;
module.exports.startPoller     = startPoller;
module.exports.stopPoller      = stopPoller;
module.exports.getStates       = () => states;
