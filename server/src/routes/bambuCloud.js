'use strict';
const router  = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requestLoginCode, submitLoginCode, getDevices } = require('../services/bambu/BambuCloud');
const BambuManager = require('../services/bambu/BambuManager');
const { getDb } = require('../db/connection');
const { broadcast } = require('../services/socket');
const logger  = require('../services/logger');

const pendingAuth = new Map();

router.post('/login', authenticate, authorize('owner'), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const result = await requestLoginCode(email, password);
    if (result.noTfa) {
      await _saveCloudCredentials(req.user.id, result.uid, result.token, email);
      return res.json({ success: true, noTfa: true, message: 'Connected to Bambu Cloud' });
    }
    pendingAuth.set(req.user.id, { tfaKey: result.tfaKey, email, password });
    res.json({ success: true, tfaRequired: true, message: `Verification code sent to ${email}` });
  } catch (err) {
    logger.error('[BambuCloud] Login error: ' + err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/verify', authenticate, authorize('owner'), async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code required' });
  const pending = pendingAuth.get(req.user.id);
  if (!pending) return res.status(400).json({ error: 'No pending login — start with /cloud/login first' });
  try {
    const result = await submitLoginCode(pending.tfaKey, code.trim(), pending.email);

    if (result.needsRelogin) {
      logger.info('[BambuCloud] Re-logging in after successful verify...');
      const relogin = await requestLoginCode(pending.email, pending.password);
      if (relogin.noTfa && relogin.token) {
        pendingAuth.delete(req.user.id);
        await _saveCloudCredentials(req.user.id, relogin.uid, relogin.token, pending.email);
        return res.json({ success: true, message: 'Bambu Cloud connected successfully' });
      }
      return res.status(400).json({ error: 'Verification succeeded but could not retrieve token. Please try again.' });
    }

    const { token, uid } = result;
    pendingAuth.delete(req.user.id);
    await _saveCloudCredentials(req.user.id, uid, token, pending.email);
    res.json({ success: true, message: 'Bambu Cloud connected successfully' });
  } catch (err) {
    logger.error('[BambuCloud] Verify error: ' + err.message);
    res.status(400).json({ error: err.message });
  }
});

router.get('/devices', authenticate, authorize('owner'), async (req, res) => {
  const creds = await _getCloudCredentials();
  if (!creds) return res.status(400).json({ error: 'Not connected to Bambu Cloud — login first' });
  try {
    const devices = await getDevices(creds.token);
    res.json(devices);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/status', authenticate, async (req, res) => {
  const creds = await _getCloudCredentials();
  res.json({ connected: !!creds, email: creds?.email || null, uid: creds?.uid || null });
});

router.post('/connect/:serial', authenticate, authorize('owner'), async (req, res) => {
  const db    = getDb();
  const creds = await _getCloudCredentials();
  if (!creds) return res.status(400).json({ error: 'Not connected to Bambu Cloud' });
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  db.prepare('UPDATE printers SET connection_mode = ?, bambu_uid = ? WHERE serial = ?').run('cloud', creds.uid, req.params.serial);
  BambuManager.connectCloud(printer, creds.uid, creds.token);
  broadcast('printer:mode_changed', { serial: req.params.serial, mode: 'cloud' });
  res.json({ message: `${printer.name} switched to Cloud Mode` });
});

router.post('/disconnect/:serial', authenticate, authorize('owner'), async (req, res) => {
  const db = getDb();
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(req.params.serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  db.prepare('UPDATE printers SET connection_mode = ? WHERE serial = ?').run('lan', req.params.serial);
  BambuManager.connect(printer);
  broadcast('printer:mode_changed', { serial: req.params.serial, mode: 'lan' });
  res.json({ message: `${printer.name} switched to LAN Mode` });
});

router.delete('/logout', authenticate, authorize('owner'), async (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM settings WHERE key = 'bambu_cloud_credentials'").run();
  db.prepare("UPDATE printers SET connection_mode = 'lan', bambu_uid = NULL WHERE connection_mode = 'cloud'").run();
  res.json({ message: 'Bambu Cloud disconnected' });
});

async function _saveCloudCredentials(userId, uid, token, email) {
  const db = getDb();
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
