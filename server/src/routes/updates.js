// routes/updates.js — serves update manifest and installer files
// Files stored at /app/data/updates/ (volume-mounted, persists across restarts)
const router  = require('express').Router();
const fs      = require('fs');
const path    = require('path');
const { authenticate } = require('../middleware/auth');

const UPDATES_DIR = path.join(process.env.DATA_PATH || './data', 'updates');

// Ensure directory exists
if (!fs.existsSync(UPDATES_DIR)) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
}

// GET /updates/latest.json — public, no auth needed (app checks this before login)
router.get('/latest.json', (req, res) => {
  const manifestPath = path.join(UPDATES_DIR, 'latest.json');
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: 'No update manifest found' });
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  res.json(manifest);
});

// GET /updates/:filename — serve installer files (DMG, EXE)
// Authenticated so only valid users can download
router.get('/:filename', authenticate, (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPDATES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.dmg' ? 'application/x-apple-diskimage'
    : ext === '.exe' ? 'application/x-msdownload'
    : 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fs.statSync(filePath).size);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
