// parts.js
const router = require('express').Router();
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const parts = db.prepare(`SELECT p.*, v.name as vendor_name FROM parts p LEFT JOIN vendors v ON p.vendor_id = v.id ORDER BY p.category, p.name`).all();
  res.json(parts.map(p => ({ ...p, is_low: p.quantity <= p.reorder_at })));
});

router.post('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const { name, category, description, quantity, reorder_at, unit_cost, vendor_id } = req.body;
  const result = db.prepare(`INSERT INTO parts (name, category, description, quantity, reorder_at, unit_cost, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, category, description ?? null, quantity ?? 0, reorder_at ?? 1, unit_cost ?? null, vendor_id ?? null);
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(result.lastInsertRowid);
  audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'parts', recordId: part.id, newValue: part });
  broadcast('parts:updated', part);
  res.status(201).json(part);
});

router.patch('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Part not found' });
  const allowed = ['name','category','description','quantity','reorder_at','unit_cost','vendor_id'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  updates.updated_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE parts SET ${sets} WHERE id = ?`).run(...Object.values(updates), existing.id);
  const updated = db.prepare('SELECT * FROM parts WHERE id = ?').get(existing.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'parts', recordId: existing.id, oldValue: existing, newValue: updates });
  broadcast('parts:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Part not found' });
  db.prepare('DELETE FROM parts WHERE id = ?').run(existing.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'parts', recordId: existing.id });
  res.json({ message: 'Part deleted' });
});

module.exports = router;
