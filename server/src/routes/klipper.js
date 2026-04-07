// routes/klipper.js — Moonraker API polling for Klipper printers
'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/connection');
const { broadcast } = require('../services/socket');
const logger = require('../services/logger');

const states  = {};
const pollers = {};

function mapKlipperStatus(stats, idle) {
  if (!stats) return 'offline';
  const state = stats.state || '';
  if (state === 'printing')   return 'printing';
  if (state === 'paused')     return 'paused';
  if (state === 'error')      return 'error';
  if (state === 'complete')   return 'idle';
  if (state === 'standby')    return 'idle';
  if (state === 'cancelled')  return 'idle';
  return 'offline';
}

async function pollKlipper(printer) {
  const base = `http://${printer.ip_address}`;
  // Moonraker API — no auth by default; access_code used as API key if set
  const headers = printer.access_code
    ? { 'X-Api-Key': printer.access_code }
    : {};

  try {
    const [printRes, tempRes] = await Promise.all([
      fetch(`${base}/printer/objects/query?print_stats&display_status&toolhead`, { headers, signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${base}/printer/objects/query?extruder&heater_bed`, { headers, signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]);

    const printObjs = printRes?.result?.status || {};
    const tempObjs  = tempRes?.result?.status  || {};

    const stats    = printObjs.print_stats   || {};
    const display  = printObjs.display_status || {};
    const extruder = tempObjs.extruder  || {};
    const bed      = tempObjs.heater_bed || {};

    // Get ETA from job info if available
    let etaMin = 0;
    const totalDur  = stats.total_duration  || 0;
    const printDur  = stats.print_duration  || 0;
    const pct       = Math.round((display.progress || 0) * 100);
    if (pct > 0 && pct < 100 && printDur > 0) {
      const totalEstSec = (printDur / (pct / 100));
      etaMin = Math.max(0, Math.round((totalEstSec - printDur) / 60));
    }

    const liveState = {
      serial:          printer.serial,
      status:          mapKlipperStatus(stats),
      nozzle_temp:     Math.round(extruder.temperature    || 0),
      nozzle_target:   Math.round(extruder.target         || 0),
      bed_temp:        Math.round(bed.temperature         || 0),
      bed_target:      Math.round(bed.target              || 0),
      chamber_temp:    0,
      print_pct:       pct,
      eta_min:         etaMin,
      layer_num:       0,
      total_layer_num: 0,
      filename:        stats.filename || '',
      connection_type: 'klipper',
      source:          'klipper',
    };

    states[printer.serial] = liveState;
    broadcast('printer:status', liveState);
  } catch (err) {
    const offline = {
      serial: printer.serial, status: 'offline',
      nozzle_temp: 0, bed_temp: 0, print_pct: 0,
      connection_type: 'klipper', source: 'klipper',
    };
    states[printer.serial] = offline;
    broadcast('printer:status', offline);
  }
}

function startPoller(printer) {
  if (pollers[printer.serial]) return;
  logger.info(`[Klipper] Starting poller for ${printer.name} (${printer.ip_address})`);
  pollKlipper(printer);
  pollers[printer.serial] = setInterval(() => pollKlipper(printer), 8000);
}

function stopPoller(serial) {
  if (pollers[serial]) {
    clearInterval(pollers[serial]);
    delete pollers[serial];
    delete states[serial];
    logger.info(`[Klipper] Stopped poller for ${serial}`);
  }
}

function startAllPollers() {
  const db = getDb();
  const printers = db.prepare(
    "SELECT * FROM printers WHERE is_active = 1 AND connection_type = 'klipper'"
  ).all();
  printers.forEach(p => startPoller(p));
}

// GET /api/klipper/status
router.get('/status', authenticate, (req, res) => {
  res.json(states);
});

// GET /api/klipper/status/:serial
router.get('/status/:serial', authenticate, (req, res) => {
  const state = states[req.params.serial];
  if (!state) return res.status(404).json({ error: 'Printer not connected' });
  res.json(state);
});

// POST /api/klipper/connect/:serial
router.post('/connect/:serial', authenticate, (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  startPoller(printer);
  res.json({ message: `Polling started for ${printer.name}` });
});

// POST /api/klipper/:serial/pause
router.post('/:serial/pause', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/printer/print/pause`, {
      method: 'POST', headers: printer.access_code ? { 'X-Api-Key': printer.access_code } : {},
      signal: AbortSignal.timeout(5000),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/klipper/:serial/resume
router.post('/:serial/resume', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/printer/print/resume`, {
      method: 'POST', headers: printer.access_code ? { 'X-Api-Key': printer.access_code } : {},
      signal: AbortSignal.timeout(5000),
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/klipper/:serial/cancel
router.post('/:serial/cancel', authenticate, async (req, res) => {
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE serial = ? AND is_active = 1").get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  try {
    await fetch(`http://${printer.ip_address}/printer/print/cancel`, {
      method: 'POST', headers: printer.access_code ? { 'X-Api-Key': printer.access_code } : {},
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
