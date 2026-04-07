// routes/email.js — send quotes and invoices by email via SMTP
'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDb } = require('../db/connection');
const logger = require('../services/logger');

function getMailer() {
  const nodemailer = require('nodemailer');
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'email_config'").get();
  if (!row?.value) throw new Error('Email not configured — add SMTP settings in Settings → Email');
  const cfg = JSON.parse(row.value);
  if (!cfg.host || !cfg.user || !cfg.pass) throw new Error('Incomplete email config — set host, user, and password in Settings → Email');

  return nodemailer.createTransport({
    host:   cfg.host,
    port:   parseInt(cfg.port) || 587,
    secure: cfg.port === '465' || cfg.secure === true,
    auth:   { user: cfg.user, pass: cfg.pass },
    tls:    { rejectUnauthorized: false }, // allow self-signed certs on local SMTP
  });
}

// POST /api/email/send-quote
// Body: { to, subject, html, pdf_base64, filename, from_name }
router.post('/send-quote', authenticate, authorize('owner', 'manager'), async (req, res) => {
  const { to, subject, html, pdf_base64, filename, from_name } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });

  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'email_config'").get();
    const cfg = row?.value ? JSON.parse(row.value) : {};
    const mailer = getMailer();

    const fromAddr = cfg.from || cfg.user;
    const fromName = from_name || cfg.from_name || 'PrintFlow';

    const mailOptions = {
      from: `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      html: html || `<p>${subject}</p>`,
      text: subject,
    };

    if (pdf_base64 && filename) {
      mailOptions.attachments = [{
        filename,
        content: Buffer.from(pdf_base64, 'base64'),
        contentType: 'application/pdf',
      }];
    }

    const info = await mailer.sendMail(mailOptions);
    logger.info(`[Email] Sent "${subject}" to ${to} — ${info.messageId}`);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    logger.error('[Email] Send failed: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/test
router.post('/test', authenticate, authorize('owner'), async (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'email_config'").get();
    const cfg = row?.value ? JSON.parse(row.value) : {};
    const mailer = getMailer();
    const info = await mailer.sendMail({
      from: `"PrintFlow" <${cfg.from || cfg.user}>`,
      to: cfg.user,
      subject: 'PrintFlow — Email Test',
      text: 'Your PrintFlow email is configured correctly.',
      html: '<p>Your PrintFlow email is configured correctly. 🎉</p>',
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/config — get current config (password masked)
router.get('/config', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'email_config'").get();
  if (!row?.value) return res.json({ configured: false });
  const cfg = JSON.parse(row.value);
  res.json({ configured: !!(cfg.host && cfg.user && cfg.pass), host: cfg.host, port: cfg.port, user: cfg.user, from_name: cfg.from_name, secure: cfg.secure });
});

module.exports = router;
