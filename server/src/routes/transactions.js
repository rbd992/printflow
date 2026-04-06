const router = require('express').Router();
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

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

module.exports = router;
