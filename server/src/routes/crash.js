// routes/crash.js — optional crash/error reporting endpoint
'use strict';
const router = require('express').Router();
const logger = require('../services/logger');

// POST /api/crash — receive crash reports from the Electron app
// No auth required — crash reporting happens before/outside auth
router.post('/', (req, res) => {
  const { error, stack, context, version, platform, timestamp } = req.body;
  if (!error) return res.status(400).json({ error: 'error field required' });

  logger.error(`[CRASH REPORT] v${version || '?'} on ${platform || '?'} at ${timestamp || new Date().toISOString()}`);
  logger.error(`  Error: ${error}`);
  if (stack) logger.error(`  Stack: ${stack.slice(0, 500)}`);
  if (context) logger.error(`  Context: ${JSON.stringify(context).slice(0, 200)}`);

  res.json({ received: true });
});

module.exports = router;
