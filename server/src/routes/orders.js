const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

// GET /api/orders
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { status, platform, limit = 100, offset = 0 } = req.query;
  let sql = `SELECT o.*, u.name as created_by_name, f.color_name as filament_color, f.material as filament_material
             FROM orders o
             LEFT JOIN users u ON o.created_by = u.id
             LEFT JOIN filament_spools f ON o.filament_id = f.id
             WHERE 1=1`;
  const params = [];
  if (status)   { sql += ' AND o.status = ?';   params.push(status); }
  if (platform) { sql += ' AND o.platform = ?'; params.push(platform); }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, u.name as created_by_name, f.color_name as filament_color, f.material as filament_material, f.color_hex
    FROM orders o
    LEFT JOIN users u ON o.created_by = u.id
    LEFT JOIN filament_spools f ON o.filament_id = f.id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// POST /api/orders
router.post('/', authenticate, authorize('owner', 'manager'),
  body('customer_name').notEmpty().trim(),
  body('platform').isIn(['etsy', 'amazon', 'direct', 'other']),
  body('description').notEmpty().trim(),
  body('price_cad').isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const {
      customer_name, customer_email, platform, description,
      filament_id, price_cad, shipping_cad, due_date, notes,
      is_historical, historical_date, payment_method,
    } = req.body;

    // Generate order number
    const count = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const order_number = `#${String(count + 1001).padStart(4, '0')}`;

    // Historical orders are created as already paid/delivered
    const isHist = !!is_historical;
    const status = isHist ? 'delivered' : 'new';
    const paid_at = isHist ? (historical_date || new Date().toISOString()) : null;
    const hist_date = isHist ? (historical_date || null) : null;

    const result = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, platform, description,
        filament_id, price_cad, shipping_cad, due_date, notes, status,
        paid_at, payment_method, is_historical, historical_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order_number, customer_name, customer_email ?? null, platform, description,
      filament_id ?? null, price_cad, shipping_cad ?? 0, due_date ?? null, notes ?? null, status,
      paid_at, payment_method ?? null, isHist ? 1 : 0, hist_date, req.user.id
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

    // Only create income transaction for historical orders (already paid)
    // Live orders get a transaction when they are marked as paid/delivered
    if (isHist) {
      const txnDate = hist_date || new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
        VALUES (?, ?, 'sales', 'income', ?, ?, ?, ?)
      `).run(
        txnDate,
        `Order ${order_number} — ${customer_name} (historical)`,
        price_cad,
        parseFloat((price_cad * 0.13).toFixed(2)),
        order.id,
        req.user.id
      );
    }

    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'orders', recordId: order.id, newValue: order });
    broadcast('order:created', order);
    res.status(201).json(order);
  }
);

// PATCH /api/orders/:id  — status update available to all, full edit to owner/manager
router.patch('/:id', authenticate,
  body('status').optional().isIn(['new','queued','printing','qc','packed','shipped','delivered','cancelled']),
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    // Operators can only update status
    const isOperator = req.user.role === 'operator';
    const allowed = isOperator
      ? ['status', 'notes']
      : ['customer_name','customer_email','platform','description','filament_id','price_cad','shipping_cad','due_date','status','tracking_number','carrier','printer_serial','notes','payment_method'];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

    // Handle payment: mark paid_at when status moves to delivered
    const newStatus = updates.status;
    const wasDelivered = existing.status === 'delivered';
    const becomingDelivered = newStatus === 'delivered' && !wasDelivered;
    const becomingCancelled = newStatus === 'cancelled' && wasDelivered;

    if (becomingDelivered && !existing.paid_at) {
      updates.paid_at = new Date().toISOString();
    }

    updates.updated_at = new Date().toISOString();

    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE orders SET ${sets} WHERE id = ?`).run(...Object.values(updates), existing.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);

    // Create income transaction when order is first marked delivered
    if (becomingDelivered && !existing.paid_at && !existing.is_historical) {
      const existingTxn = db.prepare('SELECT id FROM transactions WHERE order_id = ? AND type = ?').get(existing.id, 'income');
      if (!existingTxn) {
        db.prepare(`
          INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
          VALUES (date('now'), ?, 'sales', 'income', ?, ?, ?, ?)
        `).run(
          `Order ${existing.order_number} \u2014 ${existing.customer_name}`,
          existing.price_cad,
          parseFloat((existing.price_cad * 0.13).toFixed(2)),
          existing.id,
          req.user.id
        );
      }
    }

    // Remove income transaction if order is cancelled after being delivered
    if (becomingCancelled) {
      db.prepare('DELETE FROM transactions WHERE order_id = ? AND type = ?').run(existing.id, 'income');
    }

    audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'orders', recordId: existing.id, oldValue: existing, newValue: updates });
    broadcast('order:updated', updated);
    res.json(updated);
  }
);

// DELETE /api/orders/:id  — owner only, cascades all related data
router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  // SQLite PRAGMA cannot change FK enforcement inside a transaction.
  // Disable FK checks BEFORE starting the transaction, then re-enable after.
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM transactions WHERE order_id = ?').run(existing.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(existing.id);
  } finally {
    db.pragma('foreign_keys = ON');
  }

  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'orders', recordId: existing.id, oldValue: existing });
  broadcast('order:deleted', { id: existing.id });
  res.json({ message: 'Order deleted' });
});

module.exports = router;
