const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

const VALID_STATUSES = ['new','queued','quoted','confirmed','printing','printed',
  'post-processing','qc','packed','shipped','delivered','paid','cancelled'];

// Read company HST config from app_settings — returns { enabled, rate }
function getHstConfig(db) {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'company_config'").get();
    if (row) {
      const cfg = JSON.parse(row.value);
      return { enabled: cfg.enable_hst !== false, rate: parseFloat(cfg.hst_rate) || 13 };
    }
  } catch {}
  return { enabled: true, rate: 13 }; // safe default
}

function calcHst(amount, hst) {
  if (!hst.enabled) return 0;
  return parseFloat((amount * hst.rate / 100).toFixed(2));
}

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
  if (historical === 'true')  { sql += ' AND o.is_historical = 1'; }
  else if (historical === 'all') { /* no filter — return everything */ }
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
      order_date, paid_date,
    } = req.body;

    const count = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const order_number = `#${String(count + 1001).padStart(4, '0')}`;

    const isHist    = !!is_historical;
    const hist_date = isHist ? (historical_date || order_date || null) : null;

    const created_at_val = order_date
      ? new Date(order_date).toISOString()
      : hist_date
        ? new Date(hist_date).toISOString()
        : new Date().toISOString();

    // Respect status from client; default to paid for historical, new for live
    const resolvedStatus = VALID_STATUSES.includes(req.body.status)
      ? req.body.status
      : isHist ? 'paid' : 'new';

    const isPaidOnCreate = ['paid','delivered'].includes(resolvedStatus);
    const paid_at_val = (isPaidOnCreate || isHist)
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

    // Create income transaction if order is paid/delivered at creation or historical
    if (isPaidOnCreate || isHist) {
      const hst     = getHstConfig(db);
      const txnDate = paid_date || hist_date || order_date || new Date().toISOString().split('T')[0];
      const txnDesc = isHist
        ? `Order ${order_number} — ${customer_name} (historical)`
        : `Order ${order_number} — ${customer_name}`;
      db.prepare(`
        INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
        VALUES (?, ?, 'sales', 'income', ?, ?, ?, ?)
      `).run(txnDate, txnDesc, price_cad, calcHst(price_cad, hst), order.id, req.user.id);
    }

    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'orders', recordId: order.id, newValue: order });
    broadcast('order:created', order);
    res.status(201).json(order);
  }
);

// PATCH /api/orders/:id
router.patch('/:id', authenticate,
  body('status').optional().isIn(VALID_STATUSES),
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

    if (becomingPaid && !existing.paid_at && !updates.paid_at) {
      updates.paid_at = new Date().toISOString();
    }

    updates.updated_at = new Date().toISOString();

    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE orders SET ${sets} WHERE id = ?`).run(...Object.values(updates), existing.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);

    // Create income transaction on first payment of a live order
    if (becomingPaid && !existing.paid_at && !existing.is_historical) {
      const existingTxn = db.prepare(
        'SELECT id FROM transactions WHERE order_id = ? AND type = ?'
      ).get(existing.id, 'income');
      if (!existingTxn) {
        const hst     = getHstConfig(db);
        const txnDate = updates.paid_at
          ? updates.paid_at.split('T')[0]
          : new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
          VALUES (?, ?, 'sales', 'income', ?, ?, ?, ?)
        `).run(
          txnDate,
          `Order ${existing.order_number} — ${existing.customer_name}`,
          existing.price_cad, calcHst(existing.price_cad, hst),
          existing.id, req.user.id
        );
      }
    }

    // Reverse revenue if order cancelled after being paid
    if (becomingCancelled) {
      db.prepare('DELETE FROM transactions WHERE order_id = ? AND type = ?').run(existing.id, 'income');
    }

    audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'orders', recordId: existing.id, oldValue: existing, newValue: updates });
    broadcast('order:updated', updated);
    res.json(updated);
  }
);

// DELETE /api/orders/:id
router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found' });
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM transactions WHERE order_id = ?').run(existing.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(existing.id);
  } finally { db.pragma('foreign_keys = ON'); }
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'orders', recordId: existing.id, oldValue: existing });
  broadcast('order:deleted', { id: existing.id });
  res.json({ message: 'Order deleted' });
});

module.exports = router;
