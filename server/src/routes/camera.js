// routes/camera.js — Bambu camera streaming proxy
// Supports two protocols:
//   P1S / P1P / A1 / A1 Mini  → JPEG TCP stream on port 6000 (raw socket, no RTSP)
//   H2C / H2D / X1 / X1C      → RTSPS on port 322 via ffmpeg
'use strict';
const router  = require('express').Router();
const net     = require('net');
const { spawn } = require('child_process');
const { getDb } = require('../db/connection');
const logger  = require('../services/logger');
const jwt     = require('jsonwebtoken');

// Active stream processes keyed by serial
const activeStreams = new Map();

// ── Inline auth for img-tag streams (can't send Authorization header) ───────
function authFromQueryOrHeader(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) { res.status(401).json({ error: 'No token provided' }); return null; }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'Invalid token' }); return null;
  }
}

// ── Detect camera protocol from printer model ─────────────────────────────
function getProtocol(model) {
  // X1/H2 series use RTSPS; P1/A1 series use JPEG TCP
  const rtspsModels = ['x1', 'h2', 'x1c', 'x1e', 'p2s'];
  const m = (model || '').toLowerCase();
  return rtspsModels.some(k => m.includes(k)) ? 'rtsps' : 'jpeg_tcp';
}

// ── JPEG TCP stream (P1S, P1P, A1, A1 Mini) ─────────────────────────────────
// The P1S streams raw JPEG frames over a plain TCP socket on port 6000.
// Protocol: connect → send auth → receive JPEG frames with 16-byte headers
function streamJpegTcp(res, ip, accessCode, serial) {
  const PORT = 6000;
  const MAGIC = Buffer.from([0x40, 0x00, 0x00, 0x00]); // frame header magic

  const client = net.createConnection({ host: ip, port: PORT });

  let authenticated = false;
  let buffer = Buffer.alloc(0);
  let frameLen = 0;

  client.on('connect', () => {
    logger.info(`[Camera:${serial}] TCP connected to ${ip}:${PORT}`);
    // Send auth: username = bblp, password = access_code
    const user = Buffer.from('bblp');
    const pass = Buffer.from(accessCode);
    const auth = Buffer.alloc(4 + user.length + 4 + pass.length);
    auth.writeUInt32LE(user.length, 0);
    user.copy(auth, 4);
    auth.writeUInt32LE(pass.length, 4 + user.length);
    pass.copy(auth, 8 + user.length);
    client.write(auth);
  });

  client.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    if (!authenticated) {
      // Auth response is 4 bytes — 0 = success
      if (buffer.length >= 4) {
        const code = buffer.readUInt32LE(0);
        if (code !== 0) {
          logger.warn(`[Camera:${serial}] Auth failed: ${code}`);
          if (!res.writableEnded) res.status(401).json({ error: 'Camera auth failed — check access code' });
          client.destroy();
          return;
        }
        authenticated = true;
        buffer = buffer.slice(4);
        logger.info(`[Camera:${serial}] Auth OK — streaming JPEG frames`);
      } else {
        return; // wait for more data
      }
    }

    // Parse and forward JPEG frames
    while (true) {
      if (frameLen === 0) {
        // Need 16-byte header: magic(4) + length(4) + padding(8)
        if (buffer.length < 16) break;
        if (!buffer.slice(0, 4).equals(MAGIC)) {
          // Try to resync by finding next magic
          const idx = buffer.indexOf(MAGIC, 1);
          if (idx === -1) { buffer = Buffer.alloc(0); break; }
          buffer = buffer.slice(idx);
          continue;
        }
        frameLen = buffer.readUInt32LE(4);
        buffer = buffer.slice(16);
      }

      if (buffer.length < frameLen) break;

      const frame = buffer.slice(0, frameLen);
      buffer = buffer.slice(frameLen);
      frameLen = 0;

      if (!res.writableEnded) {
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
        res.write(frame);
        res.write('\r\n');
      }
    }
  });

  client.on('error', err => {
    logger.error(`[Camera:${serial}] TCP error: ${err.message}`);
    if (!res.writableEnded) {
      if (!res.headersSent) {
        res.status(500).json({ error: `Camera connection failed: ${err.message}` });
      } else {
        res.end();
      }
    }
  });

  client.on('close', () => {
    logger.info(`[Camera:${serial}] TCP connection closed`);
    if (!res.writableEnded) res.end();
  });

  return client;
}

// ── RTSPS stream via ffmpeg (H2C, H2D, X1, X1C) ─────────────────────────────
function streamRtsps(res, ip, accessCode, serial) {
  const rtspUrl = `rtsps://bblp:${accessCode}@${ip}:322/streaming/live/1`;

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-rtsp_transport', 'tcp',
    '-tls_verify', '0',
    '-i', rtspUrl,
    '-f', 'mjpeg',
    '-q:v', '5',
    '-r', '5',
    '-vf', 'scale=640:-1',
    'pipe:1',
  ]);

  let frameBuf = Buffer.alloc(0);
  const CRLF   = Buffer.from('\r\n');
  const SOI    = Buffer.from([0xFF, 0xD8]);
  const EOI    = Buffer.from([0xFF, 0xD9]);

  ffmpeg.stdout.on('data', chunk => {
    frameBuf = Buffer.concat([frameBuf, chunk]);
    let start = 0;
    while (true) {
      const soi = frameBuf.indexOf(SOI, start);
      if (soi === -1) break;
      const eoi = frameBuf.indexOf(EOI, soi + 2);
      if (eoi === -1) break;
      const frame = frameBuf.slice(soi, eoi + 2);
      if (!res.writableEnded) {
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
        res.write(frame);
        res.write('\r\n');
      }
      start = eoi + 2;
    }
    frameBuf = frameBuf.slice(start);
  });

  ffmpeg.stderr.on('data', d => logger.error(`[Camera:${serial}] ffmpeg: ${d.toString().trim()}`));

  ffmpeg.on('close', code => {
    logger.info(`[Camera:${serial}] ffmpeg exited (${code})`);
    if (!res.writableEnded) res.end();
  });

  ffmpeg.on('error', err => {
    const msg = err.code === 'ENOENT'
      ? 'ffmpeg not found — rebuild the container via DSM Task Scheduler'
      : err.message;
    logger.error(`[Camera:${serial}] ${msg}`);
    if (!res.headersSent) res.status(500).json({ error: msg });
  });

  return ffmpeg;
}

// ── GET /api/camera/:serial/stream ───────────────────────────────────────────
router.get('/:serial/stream', (req, res) => {
  const user = authFromQueryOrHeader(req, res);
  if (!user) return;

  const { serial } = req.params;
  const db = getDb();

  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });

  const cameraIp   = printer.camera_ip   || printer.ip_address;
  const cameraCode = printer.camera_access_code || printer.access_code;

  if (!cameraIp || !cameraCode) {
    return res.status(400).json({ error: 'No camera IP or access code configured for this printer' });
  }

  const streamId = `${serial}_${Date.now()}`;

  // Set MJPEG response headers
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const protocol = getProtocol(printer.model);
  logger.info(`[Camera:${serial}] Starting ${protocol} stream for ${printer.name} (${printer.model})`);

  let handle;
  if (protocol === 'jpeg_tcp') {
    handle = streamJpegTcp(res, cameraIp, cameraCode, serial);
  } else {
    handle = streamRtsps(res, cameraIp, cameraCode, serial);
  }

  activeStreams.set(streamId, { type: protocol === 'jpeg_tcp' ? 'tcp' : 'ffmpeg', handle });

  // Clean up when client disconnects
  req.on('close', () => {
    logger.info(`[Camera:${serial}] Client disconnected (${streamId})`);
    activeStreams.delete(streamId);
    try {
      if (protocol === 'jpeg_tcp' && handle && !handle.destroyed) handle.destroy();
      if (protocol === 'rtsps' && handle && !handle.killed) handle.kill('SIGTERM');
    } catch {}
  });
});

// ── GET /api/camera/:serial/snapshot ─────────────────────────────────────────
router.get('/:serial/snapshot', (req, res) => {
  const user = authFromQueryOrHeader(req, res);
  if (!user) return;

  const { serial } = req.params;
  const db = getDb();
  const printer = db.prepare('SELECT * FROM printers WHERE serial = ? AND is_active = 1').get(serial);
  if (!printer) return res.status(404).json({ error: 'Printer not found' });

  const cameraIp   = printer.camera_ip   || printer.ip_address;
  const cameraCode = printer.camera_access_code || printer.access_code;
  const protocol   = getProtocol(printer.model);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'no-cache');

  if (protocol === 'jpeg_tcp') {
    // Get a single frame via TCP
    const PORT = 6000;
    const client = net.createConnection({ host: cameraIp, port: PORT });
    let authenticated = false;
    let buf = Buffer.alloc(0);
    let done = false;

    const finish = () => { if (!done) { done = true; client.destroy(); } };

    client.on('connect', () => {
      const user = Buffer.from('bblp');
      const pass = Buffer.from(cameraCode);
      const auth = Buffer.alloc(4 + user.length + 4 + pass.length);
      auth.writeUInt32LE(user.length, 0);
      user.copy(auth, 4);
      auth.writeUInt32LE(pass.length, 4 + user.length);
      pass.copy(auth, 8 + user.length);
      client.write(auth);
    });

    client.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      if (!authenticated) {
        if (buf.length < 4) return;
        authenticated = true;
        buf = buf.slice(4);
      }
      // Wait for full frame header + frame
      if (buf.length < 16) return;
      const frameLen = buf.readUInt32LE(4);
      if (buf.length < 16 + frameLen) return;
      const frame = buf.slice(16, 16 + frameLen);
      if (!res.headersSent) res.end(frame);
      finish();
    });

    client.on('error', err => { if (!res.headersSent) res.status(500).json({ error: err.message }); finish(); });
    setTimeout(finish, 10000); // 10s timeout
  } else {
    // RTSPS snapshot via ffmpeg
    const rtspUrl = `rtsps://bblp:${cameraCode}@${cameraIp}:322/streaming/live/1`;
    const ffmpeg = spawn('ffmpeg', [
      '-loglevel', 'error', '-rtsp_transport', 'tcp', '-tls_verify', '0',
      '-i', rtspUrl, '-frames:v', '1', '-f', 'image2', '-vcodec', 'mjpeg', 'pipe:1',
    ]);
    ffmpeg.stdout.pipe(res);
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', err => { if (!res.headersSent) res.status(500).json({ error: err.message }); });
    req.on('close', () => { if (!ffmpeg.killed) ffmpeg.kill('SIGTERM'); });
  }
});

// ── DELETE /api/camera/:serial/stream — stop active stream ───────────────────
router.delete('/:serial/stream', (req, res) => {
  const { serial } = req.params;
  const stream = activeStreams.get(serial);
  if (stream) {
    try {
      if (stream.type === 'tcp') stream.socket.destroy();
      if (stream.type === 'ffmpeg' && !stream.proc.killed) stream.proc.kill('SIGTERM');
    } catch {}
    activeStreams.delete(serial);
  }
  res.json({ ok: true });
});

// ── GET /api/camera/active ────────────────────────────────────────────────────
router.get('/active', (req, res) => {
  res.json({ active: [...activeStreams.keys()] });
});

module.exports = router;
