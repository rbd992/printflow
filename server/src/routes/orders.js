const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

// GET /api/orders
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { status, platform, limit = 100, offset = 0, historical } = req.query;
  let sql = `SELECT o.*, u.name as created_by_name, f.color_name as filament_color, f.material as filament_material
             FROM orders o
             LEFT JOIN users u ON o.created_by = u.id
             LEFT JOIN filament_spools f ON o.filament_id = f.id
             WHERE 1=1`;
  const params = [];
  if (status)   { sql += ' AND o.status = ?';   params.push(status); }
  if (platform) { sql += ' AND o.platform = ?'; params.push(platform); }
  // Default: exclude historical. ?historical=true = only historical. ?historical=all = everything.
  if (historical === 'true')  { sql += ' AND o.is_historical = 1'; }
  else if (historical === 'all') { /* no filter */ }
  else                           { sql += ' AND o.is_historical = 0'; }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(db.prepare(sql).all(...params));
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
  body('platform').notEmpty().trim(),
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
      order_date,   // optional backdated order date (any order type)
      paid_date,    // optional backdated paid/delivery date (any order type)
    } = req.body;

    // Generate order number
    const count = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const order_number = `#${String(count + 1001).padStart(4, '0')}`;

    const isHist    = !!is_historical;
    const hist_date = isHist ? (historical_date || order_date || null) : null;

    const created_at_val = order_date
      ? new Date(order_date).toISOString()
      : hist_date
        ? new Date(hist_date).toISOString()
        : new Date().toISOString();

    // Respect the status sent from the client — validate it
    const VALID_STATUSES = ['new','queued','quoted','confirmed','printing','printed',
      'post-processing','qc','packed','shipped','delivered','paid','cancelled'];
    const sentStatus = req.body.status;
    const resolvedStatus = VALID_STATUSES.includes(sentStatus)
      ? sentStatus
      : isHist ? 'paid' : 'new';

    // Set paid_at if order is being created as paid/delivered
    const isPaid = ['paid','delivered'].includes(resolvedStatus);
    const paid_at_val = isPaid || isHist
      ? (paid_date || hist_date || order_date || new Date().toISOString().split('T')[0])
      : (paid_date || null);

    const result = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, platform, description,
        filament_id, price_cad, shipping_cad, due_date, notes, status,
        paid_at, payment_method, is_historical, historical_date, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order_number, customer_name, customer_email ?? null, platform?.trim() || 'direct', description,
      filament_id ?? null, price_cad, shipping_cad ?? 0, due_date ?? null, notes ?? null, resolvedStatus,
      paid_at_val, payment_method ?? null, isHist ? 1 : 0, hist_date, req.user.id,
      created_at_val, created_at_val
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

    // Create income transaction if order is created as paid/delivered or is historical
    if (isPaid || isHist) {
      const txnDate = paid_date || hist_date || order_date || new Date().toISOString().split('T')[0];
      const txnDesc = isHist
        ? `Order ${order_number} — ${customer_name} (historical)`
        : `Order ${order_number} — ${customer_name}`;
      db.prepare(`
        INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
        VALUES (?, ?, 'sales', 'income', ?, ?, ?, ?)
      `).run(
        txnDate, txnDesc, price_cad,
        parseFloat((price_cad * 0.13).toFixed(2)),
        order.id, req.user.id
      );
    }

    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'orders', recordId: order.id, newValue: order });
    broadcast('order:created', order);
    res.status(201).json(order);
  }
);

// PATCH /api/orders/:id  — status update available to all, full edit to owner/manager
router.patch('/:id', authenticate,
  body('status').optional().isIn(['new','queued','quoted','confirmed','printing','printed','post-processing','qc','packed','shipped','delivered','paid','cancelled']),
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const isOperator = req.user.role === 'operator';
    const allowed = isOperator
      ? ['status', 'notes']
      : ['customer_name','customer_email','platform','description','filament_id','price_cad','shipping_cad',
         'due_date','status','tracking_number','carrier','printer_serial','notes','payment_method','paid_at','created_at'];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

    const newStatus         = updates.status;
    const wasDelivered      = ['delivered','paid'].includes(existing.status);
    const becomingPaid      = ['delivered','paid'].includes(newStatus) && !wasDelivered;
    const becomingCancelled = newStatus === 'cancelled' && wasDelivered;

    // Stamp paid_at on first payment if not already set or explicitly provided
    if (becomingPaid && !existing.paid_at && !updates.paid_at) {
      updates.paid_at = new Date().toISOString();
    }

    updates.updated_at = new Date().toISOString();

    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE orders SET ${sets} WHERE id = ?`).run(...Object.values(updates), existing.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);

    // Create income transaction when a live order is first marked paid/delivered
    if (becomingPaid && !existing.paid_at && !existing.is_historical) {
      const existingTxn = db.prepare(
        'SELECT id FROM transactions WHERE order_id = ? AND type = ?'
      ).get(existing.id, 'income');

      if (!existingTxn) {
        // Use the paid_at date we just set (may be backdated if explicitly passed)
        const txnDate = updates.paid_at
          ? updates.paid_at.split('T')[0]
          : new Date().toISOString().split('T')[0];

        db.prepare(`
          INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
          VALUES (?, ?, 'sales', 'income', ?, ?, ?, ?)
        `).run(
          txnDate,
          `Order ${existing.order_number} — ${existing.customer_name}`,
          existing.price_cad,
          parseFloat((existing.price_cad * 0.13).toFixed(2)),
          existing.id,
          req.user.id
        );
      }
    }

    // Reverse revenue if a delivered order is cancelled
    if (becomingCancelled) {
      db.prepare(
        'DELETE FROM transactions WHERE order_id = ? AND type = ?'
      ).run(existing.id, 'income');
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
