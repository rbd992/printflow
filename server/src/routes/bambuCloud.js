'use strict';
/**
 * Bambu Cloud Authentication Routes
 * Handles the 2FA login flow to get cloud MQTT credentials.
 *
 * POST /api/bambu/cloud/login        — step 1: request 2FA code
 * POST /api/bambu/cloud/verify       — step 2: submit 2FA code, get token
 * GET  /api/bambu/cloud/devices      — list printers on Bambu account
 * POST /api/bambu/cloud/connect/:serial — switch a printer to cloud mode
 * DELETE /api/bambu/cloud/logout     — remove cloud credentials
 */
const router  = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requestLoginCode, submitLoginCode, getDevices } = require('../services/bambu/BambuCloud');
const BambuManager = require('../services/bambu/BambuManager');
const { getDb } = require('../db/connection');
const { broadcast } = require('../services/socket');
const logger  = require('../services/logger');

// Temporary in-memory store for pending 2FA sessions
const pendingAuth = new Map(); // userId → { tfaKey, email }

// POST /api/bambu/cloud/login — send 2FA code to Bambu email
router.post('/login', authenticate, authorize('owner'), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const result = await requestLoginCode(email, password);

    if (result.noTfa) {
      // No 2FA required — save credentials immediately
      await _saveCloudCredentials(req.user.id, result.uid, result.token, email);
      return res.json({ success: true, noTfa: true, message: 'Connected to Bambu Cloud' });
    }

    // Store tfaKey for this user's pending auth
    pendingAuth.set(req.user.id, { tfaKey: result.tfaKey, email });
    res.json({ success: true, tfaRequired: true, message: `Verification code sent to ${email}` });
  } catch (err) {
    logger.error('[BambuCloud] Login error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/bambu/cloud/verify — submit 2FA code
router.post('/verify', authenticate, authorize('owner'), async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code required' });

  const pending = pendingAuth.get(req.user.id);
  if (!pending) return res.status(400).json({ error: 'No pending login — start with /cloud/login first' });

  try {
    const { token, uid } = await submitLoginCode(pending.tfaKey, code.trim(), pending.email);
    pendingAuth.delete(req.user.id);
    await _saveCloudCredentials(req.user.id, uid, token, pending.email);
    res.json({ success: true, message: 'Bambu Cloud connected successfully' });
  } catch (err) {
    logger.error('[BambuCloud] Verify error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bambu/cloud/devices — list printers on the Bambu account
router.get('/devices', authenticate, authorize('owner'), async (req, res) => {
  const creds = await _getCloudCredentials();
  if (!creds) return res.status(400).json({ error: 'Not connected to Bambu Cloud — login first' });

  try {
    const devices = await getDevices(creds.token);
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bambu/cloud/status — check if cloud is connected
router.get('/status', authenticate, async (req, res) => {
  const creds = await _getCloudCredentials();
  res.json({
    connected: !!creds,
    email:     creds?.email || null,
    uid:       creds?.uid   || null,
  });
});

// POST /api/bambu/cloud/connect/:serial — switch a printer to cloud mode
router.post('/connect/:serial', authenticate, authorize('owner'), async (req, res) => {
  const db    = getDb();
  const creds = await _getCloudCredentials();
  if (!creds) return res.status(400).json({ error: 'Not connected to Bambu Cloud' });

  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });

  // Save cloud mode flag to printer
  db.prepare('UPDATE printers SET connection_mode = ?, bambu_uid = ? WHERE serial = ?')
    .run('cloud', creds.uid, req.params.serial);

  // Reconnect via cloud
  BambuManager.connectCloud(printer, creds.uid, creds.token);
  broadcast('printer:mode_changed', { serial: req.params.serial, mode: 'cloud' });

  res.json({ message: `${printer.name} switched to Cloud Mode` });
});

// POST /api/bambu/cloud/disconnect/:serial — switch back to LAN mode
router.post('/disconnect/:serial', authenticate, authorize('owner'), async (req, res) => {
  const db = getDb();
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });

  db.prepare('UPDATE printers SET connection_mode = ? WHERE serial = ?').run('lan', req.params.serial);
  BambuManager.connect(printer); // reconnect via LAN
  broadcast('printer:mode_changed', { serial: req.params.serial, mode: 'lan' });

  res.json({ message: `${printer.name} switched to LAN Mode` });
});

// DELETE /api/bambu/cloud/logout — remove cloud credentials
router.delete('/logout', authenticate, authorize('owner'), async (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM settings WHERE key = 'bambu_cloud_credentials'").run();
  // Switch all cloud printers back to LAN
  db.prepare("UPDATE printers SET connection_mode = 'lan', bambu_uid = NULL WHERE connection_mode = 'cloud'").run();
  res.json({ message: 'Bambu Cloud disconnected' });
});

// ── Helpers ────────────────────────────────────────────────────────

async function _saveCloudCredentials(userId, uid, token, email) {
  const db = getDb();
  // Ensure settings table exists
  db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('bambu_cloud_credentials', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(JSON.stringify({ uid, token, email }), new Date().toISOString());
  logger.info(`[BambuCloud] Credentials saved for uid=${uid}`);
}

async function _getCloudCredentials() {
  const db = getDb();
  try {
    db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
    const row = db.prepare("SELECT value FROM settings WHERE key = 'bambu_cloud_credentials'").get();
    return row ? JSON.parse(row.value) : null;
  } catch { return null; }
}

module.exports = router;
module.exports._getCloudCredentials = _getCloudCredentials;
