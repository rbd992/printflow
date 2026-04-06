// routes/notifications.js — push notifications via ntfy.sh
// Called internally when jobs move to done/failed stage
const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const logger = require('../services/logger');

async function sendNtfy(topic, title, message, tags = 'printer', priority = 'default') {
  if (!topic) return;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: message,
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags,
      },
    });
    if (res.ok) {
      logger.info(`[ntfy] Sent: ${title}`);
    } else {
      logger.warn(`[ntfy] Failed: ${res.status}`);
    }
  } catch (err) {
    logger.warn(`[ntfy] Error: ${err.message}`);
  }
}

// GET /api/notifications/config — get ntfy config
router.get('/config', authenticate, (req, res) => {
  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), updated_by INTEGER)`);
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ntfy_config'").get();
    res.json(row ? JSON.parse(row.value) : { topic: '', enabled: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/notifications/test — send a test notification
router.post('/test', authenticate, async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  await sendNtfy(topic, 'PrintFlow', 'Test notification from PrintFlow ✅', 'white_check_mark');
  res.json({ ok: true });
});

// POST /api/notifications/send — send a notification (internal use)
router.post('/send', authenticate, async (req, res) => {
  const { title, message, tags, priority } = req.body;
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ntfy_config'").get();
    const config = row ? JSON.parse(row.value) : null;
    if (!config?.enabled || !config?.topic) {
      return res.json({ ok: false, reason: 'Notifications not configured or disabled' });
    }
    await sendNtfy(config.topic, title, message, tags, priority);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.sendNtfy = sendNtfy;
