// routes/camera.js — Bambu camera RTSPS → MJPEG proxy
// Transcodes the printer's RTSPS stream via ffmpeg into an MJPEG stream
// that can be displayed directly in a browser <img> tag
'use strict';
const router  = require('express').Router();
const { spawn } = require('child_process');
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const logger  = require('../services/logger');

// Active ffmpeg processes — keyed by serial number
const activeStreams = new Map();

// GET /api/camera/:serial/stream — MJPEG stream
// Returns multipart/x-mixed-replace MJPEG suitable for <img src="...">
// Accepts token as query param since <img> tags can't set Authorization headers
router.get('/:serial/stream', (req, res) => {
  // Accept token from header OR query param (img tags can't set headers)
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const jwt = require('jsonwebtoken');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const { serial } = req.params;
  const db = getDb();

  // Get printer credentials
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });
  // Use camera-specific IP and code if set, otherwise fall back to printer's LAN settings
  const cameraIp = printer.camera_ip || printer.ip_address;
  const cameraCode = printer.camera_access_code || printer.access_code;

  if (!cameraIp || !cameraCode) {
    return res.status(400).json({ error: 'No camera IP or access code configured for this printer' });
  }

  // Build RTSPS URL — Bambu uses bblp as username, access_code as password
  const rtspUrl = `rtsps://bblp:${cameraCode}@${cameraIp}:322/streaming/live/1`;

  logger.info(`[Camera] Starting stream for ${printer.name} (${serial})`);

  // Set MJPEG headers
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Spawn ffmpeg to transcode RTSPS → MJPEG
  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-rtsp_transport', 'tcp',
    '-tls_verify', '0',            // Bambu uses self-signed cert
    '-i', rtspUrl,
    '-f', 'mjpeg',                 // Output as MJPEG
    '-q:v', '5',                   // Quality 1-31 (lower = better)
    '-r', '5',                     // 5fps — good balance of smoothness vs bandwidth
    '-vf', 'scale=640:-1',         // Scale to 640px wide
    'pipe:1',                      // Output to stdout
  ]);

  activeStreams.set(serial, ffmpeg);

  let buffer = Buffer.alloc(0);

  ffmpeg.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Find JPEG boundaries and send each frame
    let start = 0;
    while (true) {
      // JPEG starts with 0xFF 0xD8 and ends with 0xFF 0xD9
      const soi = buffer.indexOf(Buffer.from([0xFF, 0xD8]), start);
      if (soi === -1) break;
      const eoi = buffer.indexOf(Buffer.from([0xFF, 0xD9]), soi + 2);
      if (eoi === -1) break;

      const frame = buffer.slice(soi, eoi + 2);

      if (!res.writableEnded) {
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
        res.write(frame);
        res.write('\r\n');
      }

      start = eoi + 2;
    }

    // Keep unprocessed bytes
    buffer = buffer.slice(start);
  });

  ffmpeg.stderr.on('data', (data) => {
    logger.warn(`[Camera:${serial}] ffmpeg: ${data.toString().trim()}`);
  });

  ffmpeg.on('close', (code) => {
    logger.info(`[Camera:${serial}] ffmpeg exited (${code})`);
    activeStreams.delete(serial);
    if (!res.writableEnded) res.end();
  });

  ffmpeg.on('error', (err) => {
    if (err.code === 'ENOENT') {
      logger.error('[Camera] ffmpeg not found — install ffmpeg in the container');
      if (!res.writableEnded) {
        res.status(500).json({ error: 'ffmpeg not installed on server' });
      }
    } else {
      logger.error(`[Camera:${serial}] ffmpeg error: ${err.message}`);
    }
    activeStreams.delete(serial);
  });

  // Clean up when client disconnects
  req.on('close', () => {
    logger.info(`[Camera:${serial}] Client disconnected, stopping ffmpeg`);
    if (ffmpeg && !ffmpeg.killed) ffmpeg.kill('SIGTERM');
    activeStreams.delete(serial);
  });
});

// GET /api/camera/:serial/snapshot — single JPEG snapshot
router.get('/:serial/snapshot', authenticate, (req, res) => {
  const { serial } = req.params;
  const db = getDb();

  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });

  const rtspUrl = `rtsps://bblp:${printer.access_code}@${printer.ip_address}:322/streaming/live/1`;

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-rtsp_transport', 'tcp',
    '-tls_verify', '0',
    '-i', rtspUrl,
    '-frames:v', '1',              // Capture just one frame
    '-f', 'image2',
    '-vcodec', 'mjpeg',
    'pipe:1',
  ]);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'no-cache');

  ffmpeg.stdout.pipe(res);
  ffmpeg.stderr.on('data', () => {});
  ffmpeg.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });

  req.on('close', () => { if (!ffmpeg.killed) ffmpeg.kill('SIGTERM'); });
});

// DELETE /api/camera/:serial/stream — stop an active stream
router.delete('/:serial/stream', authenticate, (req, res) => {
  const { serial } = req.params;
  const proc = activeStreams.get(serial);
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
    activeStreams.delete(serial);
    res.json({ ok: true, message: 'Stream stopped' });
  } else {
    res.json({ ok: true, message: 'No active stream' });
  }
});

// GET /api/camera/active — list active streams
router.get('/active', authenticate, (req, res) => {
  res.json({ active: [...activeStreams.keys()] });
});

module.exports = router;
