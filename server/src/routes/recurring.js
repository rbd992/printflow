// routes/recurring.js — generate next orders from recurring templates
'use strict';
const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../db/audit');
const { broadcast } = require('../services/socket');

function addInterval(dateStr, interval) {
  const d = new Date(dateStr);
  switch (interval) {
    case 'weekly':     d.setDate(d.getDate() + 7);   break;
    case 'biweekly':   d.setDate(d.getDate() + 14);  break;
    case 'monthly':    d.setMonth(d.getMonth() + 1); break;
    case 'quarterly':  d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString().split('T')[0];
}

function getHstConfig(db) {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'company_config'").get();
    if (row) {
      const cfg = JSON.parse(row.value);
      return { enabled: cfg.enable_hst !== false, rate: parseFloat(cfg.hst_rate) || 13 };
    }
  } catch {}
  return { enabled: true, rate: 13 };
}

// GET /api/recurring — list all recurring order templates
router.get('/', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE is_recurring = 1 AND status != 'cancelled'
    ORDER BY recurring_next_date ASC
  `).all();
  res.json(orders);
});

// POST /api/recurring/generate — generate due recurring orders
// Called manually or on a schedule; creates new orders for any recurring template due today or overdue
router.post('/generate', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const due = db.prepare(`
    SELECT * FROM orders
    WHERE is_recurring = 1
      AND status != 'cancelled'
      AND recurring_next_date IS NOT NULL
      AND recurring_next_date <= ?
  `).all(today);

  const created = [];

  for (const template of due) {
    const count = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const order_number = `#${String(count + 1001).padStart(4, '0')}`;
    const nextDate = addInterval(today, template.recurring_interval);

    // Create the new order
    const result = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, platform, description,
        filament_id, price_cad, shipping_cad, due_date, notes, status,
        is_recurring, recurring_interval, recurring_next_date, recurring_parent_id,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 0, NULL, NULL, ?, ?, datetime('now'), datetime('now'))
    `).run(
      order_number,
      template.customer_name,
      template.customer_email,
      template.platform,
      template.description,
      template.filament_id,
      template.price_cad,
      template.shipping_cad,
      nextDate, // use next interval date as due date
      template.notes,
      template.id,
      req.user.id,
      new Date().toISOString(),
    );

    // Advance the template's next_date
    db.prepare(`
      UPDATE orders SET recurring_next_date = ?, updated_at = datetime('now') WHERE id = ?
    `).run(nextDate, template.id);

    const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    created.push(newOrder);
    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'orders', recordId: newOrder.id, newValue: newOrder });
    broadcast('order:created', newOrder);
  }

  res.json({ generated: created.length, orders: created });
});

// POST /api/recurring/:id/skip — skip the next occurrence
router.post('/:id/skip', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND is_recurring = 1').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Recurring order not found' });

  const next = addInterval(order.recurring_next_date || new Date().toISOString().split('T')[0], order.recurring_interval);
  db.prepare('UPDATE orders SET recurring_next_date = ?, updated_at = datetime(\'now\') WHERE id = ?').run(next, order.id);
  res.json({ skipped_to: next });
});

// DELETE /api/recurring/:id — stop recurring (cancel the template)
router.delete('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE orders SET is_recurring = 0, recurring_interval = NULL, recurring_next_date = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ message: 'Recurring cancelled' });
});

module.exports = router;
