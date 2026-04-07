// routes/backup.js — database backup and restore
const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const logger  = require('../services/logger');

// GET /api/backup/download — stream the SQLite database file as a download
router.get('/download', authenticate, authorize('owner'), (req, res) => {
  try {
    const dbPath = path.resolve(process.env.DB_PATH || './data/printflow.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const stat    = fs.statSync(dbPath);
    const ts      = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `printflow-backup-${ts}.db`;

    // Use SQLite's built-in backup API for a safe online backup
    // This avoids file-level corruption from copying a live database
    const db = getDb();
    const tmpPath = `${dbPath}.backup-tmp`;

    db.backup(tmpPath)
      .then(() => {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', fs.statSync(tmpPath).size);

        const stream = fs.createReadStream(tmpPath);
        stream.pipe(res);
        stream.on('end', () => {
          try { fs.unlinkSync(tmpPath); } catch {}
        });
        stream.on('error', (err) => {
          logger.error('Backup stream error: ' + err.message);
          try { fs.unlinkSync(tmpPath); } catch {}
        });
      })
      .catch(err => {
        logger.error('Backup failed: ' + err.message);
        try { fs.unlinkSync(tmpPath); } catch {}
        res.status(500).json({ error: 'Backup failed: ' + err.message });
      });
  } catch (err) {
    logger.error('Backup error: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/info — return info about the current database
router.get('/info', authenticate, authorize('owner'), (req, res) => {
  try {
    const dbPath = path.resolve(process.env.DB_PATH || './data/printflow.db');
    if (!fs.existsSync(dbPath)) {
      return res.json({ exists: false });
    }
    const stat = fs.statSync(dbPath);
    const db   = getDb();

    const orderCount    = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const customerCount = db.prepare('SELECT COUNT(*) as n FROM transactions').get().n;
    const migrations    = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get().v;

    res.json({
      exists:     true,
      sizeBytes:  stat.size,
      sizeMb:     (stat.size / 1024 / 1024).toFixed(2),
      modified:   stat.mtime.toISOString(),
      orders:     orderCount,
      transactions: customerCount,
      schemaVersion: migrations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/restore — restore a database from an uploaded .db file
// WARNING: This replaces the live database. Use with extreme caution.
router.post('/restore', authenticate, authorize('owner'), (req, res) => {
  const multer = require('multer');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, cb) => {
      if (!file.originalname.endsWith('.db')) {
        return cb(new Error('Only .db files are accepted'));
      }
      cb(null, true);
    },
  }).single('database');

  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      // Validate the uploaded file is a SQLite database
      const header = req.file.buffer.slice(0, 16).toString('utf8');
      if (!header.startsWith('SQLite format 3')) {
        return res.status(400).json({ error: 'Uploaded file is not a valid SQLite database' });
      }

      const dbPath  = path.resolve(process.env.DB_PATH || './data/printflow.db');
      const bakPath = `${dbPath}.pre-restore-${Date.now()}.bak`;

      // Keep the previous database as a safety backup
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, bakPath);
        logger.info(`Pre-restore backup saved to ${bakPath}`);
      }

      // Write the new database file
      fs.writeFileSync(dbPath, req.file.buffer);
      logger.info(`Database restored from upload by user ${req.user?.name}`);

      res.json({
        ok: true,
        message: 'Database restored successfully. Please restart the server to apply changes.',
        backupSaved: bakPath,
      });
    } catch (err) {
      logger.error('Restore failed: ' + err.message);
      res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
  });
});

module.exports = router;
