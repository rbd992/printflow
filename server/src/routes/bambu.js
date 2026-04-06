'use strict';
const router       = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const BambuManager = require('../services/bambu/BambuManager');
const { getDb }    = require('../db/connection');
const logger       = require('../services/logger');

// GET /api/bambu/status — all printer live states
router.get('/status', authenticate, (req, res) => {
  res.json(BambuManager.getAllStates());
});

// GET /api/bambu/status/:serial — single printer
router.get('/status/:serial', authenticate, (req, res) => {
  const client = BambuManager.getClient(req.params.serial);
  if (!client) return res.status(404).json({ error: 'Printer not connected' });
  res.json(client.currentState);
});

// POST /api/bambu/connect/:serial — (re)connect a printer
router.post('/connect/:serial', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db      = getDb();
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  BambuManager.connect(printer);
  res.json({ message: `Connecting to ${printer.name}` });
});

// POST /api/bambu/disconnect/:serial
router.post('/disconnect/:serial', authenticate, authorize('owner'), (req, res) => {
  BambuManager.disconnect(req.params.serial);
  res.json({ message: 'Disconnected' });
});

// POST /api/bambu/:serial/pause
router.post('/:serial/pause', authenticate, authorize('owner', 'manager'), (req, res) => {
  const client = BambuManager.getClient(req.params.serial);
  if (!client) return res.status(404).json({ error: 'Printer not connected' });
  client.pause();
  logger.info(`[Bambu] Pause sent to ${req.params.serial} by ${req.user.name}`);
  res.json({ message: 'Pause sent' });
});

// POST /api/bambu/:serial/resume
router.post('/:serial/resume', authenticate, authorize('owner', 'manager'), (req, res) => {
  const client = BambuManager.getClient(req.params.serial);
  if (!client) return res.status(404).json({ error: 'Printer not connected' });
  client.resume();
  res.json({ message: 'Resume sent' });
});

// POST /api/bambu/:serial/stop
router.post('/:serial/stop', authenticate, authorize('owner'), (req, res) => {
  const client = BambuManager.getClient(req.params.serial);
  if (!client) return res.status(404).json({ error: 'Printer not connected' });
  client.stop();
  logger.info(`[Bambu] STOP sent to ${req.params.serial} by ${req.user.name}`);
  res.json({ message: 'Stop sent' });
});

// POST /api/bambu/:serial/speed
router.post('/:serial/speed', authenticate, authorize('owner', 'manager'), (req, res) => {
  const { level } = req.body;  // 1=silent, 2=standard, 3=sport, 4=ludicrous
  if (![1,2,3,4].includes(level)) return res.status(400).json({ error: 'level must be 1-4' });
  const client = BambuManager.getClient(req.params.serial);
  if (!client) return res.status(404).json({ error: 'Printer not connected' });
  client.setSpeed(level);
  res.json({ message: `Speed set to level ${level}` });
});

module.exports = router;
