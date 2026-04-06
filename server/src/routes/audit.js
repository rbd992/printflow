const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit
router.get('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const { limit = 100, offset = 0, user_id, action, table_name } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (user_id)    { sql += ' AND user_id = ?';    params.push(user_id); }
  if (action)     { sql += ' AND action = ?';     params.push(action); }
  if (table_name) { sql += ' AND table_name = ?'; params.push(table_name); }
  // Managers see only their own audit entries
  if (req.user.role === 'manager') {
    sql += ' AND user_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
