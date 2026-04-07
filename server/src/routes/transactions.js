const router = require('express').Router();
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Receipt storage — save to data/receipts/
const RECEIPTS_DIR = path.join(__dirname, '../../data/receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|heic)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only image files allowed'), ok);
  },
});

router.get('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const { type, category, limit = 200, offset = 0 } = req.query;
  let sql = 'SELECT t.*, o.order_number FROM transactions t LEFT JOIN orders o ON t.order_id = o.id WHERE 1=1';
  const params = [];
  if (type)     { sql += ' AND t.type = ?';     params.push(type); }
  if (category) { sql += ' AND t.category = ?'; params.push(category); }
  sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(db.prepare(sql).all(...params));
});

router.post('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const { date, description, category, type, amount_cad, hst_amount, order_id } = req.body;
  if (!date || !description || !category || !type || !amount_cad) {
    return res.status(400).json({ error: 'date, description, category, type, amount_cad required' });
  }
  const result = db.prepare(`
    INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, description, category, type, parseFloat(amount_cad), parseFloat(hst_amount)||0, order_id||null, req.user.id);
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'transactions', recordId: txn.id, newValue: txn });
  broadcast('transaction:created', txn);
  res.status(201).json(txn);
});

router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(txn.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'transactions', recordId: txn.id });
  res.json({ message: 'Deleted' });
});

// POST /api/transactions/:id/receipt — upload a receipt photo
router.post('/:id/receipt', authenticate, authorize('owner', 'manager'), upload.single('receipt'), (req, res) => {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Delete old receipt file if exists
  if (txn.receipt_url) {
    const oldPath = path.join(RECEIPTS_DIR, path.basename(txn.receipt_url));
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
  }

  const url = `/api/transactions/receipts/${req.file.filename}`;
  db.prepare('UPDATE transactions SET receipt_url = ?, receipt_filename = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(url, req.file.originalname, txn.id);
  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txn.id);
  res.json({ receipt_url: url, receipt_filename: req.file.originalname, transaction: updated });
});

// DELETE /api/transactions/:id/receipt — remove a receipt
router.delete('/:id/receipt', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  if (txn.receipt_url) {
    const filePath = path.join(RECEIPTS_DIR, path.basename(txn.receipt_url));
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  }
  db.prepare('UPDATE transactions SET receipt_url = NULL, receipt_filename = NULL WHERE id = ?').run(txn.id);
  res.json({ message: 'Receipt removed' });
});

// GET /api/transactions/receipts/:filename — serve receipt image
router.get('/receipts/:filename', authenticate, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(RECEIPTS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Receipt not found' });
  res.sendFile(filePath);
});

module.exports = router;
