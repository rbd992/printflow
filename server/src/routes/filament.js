const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

// GET /api/filament
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const spools = db.prepare(`
    SELECT f.*, v.name as vendor_name, v.website_url as vendor_url
    FROM filament_spools f
    LEFT JOIN vendors v ON f.vendor_id = v.id
    ORDER BY f.material, f.brand, f.color_name
  `).all();
  // Annotate with low-stock flag
  const result = spools.map(s => ({
    ...s,
    is_low: s.remaining_g <= s.reorder_at_g,
    pct_remaining: Math.round((s.remaining_g / s.full_weight_g) * 100),
  }));
  res.json(result);
});

// GET /api/filament/low-stock
router.get('/low-stock', authenticate, (req, res) => {
  const db = getDb();
  const spools = db.prepare(`
    SELECT * FROM filament_spools WHERE remaining_g <= reorder_at_g ORDER BY remaining_g ASC
  `).all();
  res.json(spools);
});

// GET /api/filament/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const spool = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(req.params.id);
  if (!spool) return res.status(404).json({ error: 'Spool not found' });
  res.json(spool);
});

// POST /api/filament
router.post('/', authenticate, authorize('owner', 'manager'),
  body('brand').notEmpty().trim(),
  body('material').notEmpty().trim(),  // Accept any material — catalogue has 18+ types
  body('color_name').notEmpty().trim(),
  body('remaining_g').isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const { brand, material, color_name, color_hex, diameter_mm, full_weight_g, remaining_g, cost_cad, reorder_at_g, auto_reorder, reorder_qty, vendor_id, notes } = req.body;

    const result = db.prepare(`
      INSERT INTO filament_spools (brand, material, color_name, color_hex, diameter_mm, full_weight_g, remaining_g, cost_cad, reorder_at_g, auto_reorder, reorder_qty, vendor_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(brand, material, color_name, color_hex ?? '#888888', diameter_mm ?? 1.75, full_weight_g ?? 1000, remaining_g, cost_cad ?? 0, reorder_at_g ?? 200, auto_reorder ? 1 : 0, reorder_qty ?? 1, vendor_id ?? null, notes ?? null);

    const spool = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(result.lastInsertRowid);
    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'filament_spools', recordId: spool.id, newValue: spool });
    broadcast('filament:updated', spool);
    res.status(201).json(spool);
  }
);

// PATCH /api/filament/:id
router.patch('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Spool not found' });

  const allowed = ['brand','material','color_name','color_hex','diameter_mm','full_weight_g','remaining_g','cost_cad','reorder_at_g','auto_reorder','reorder_qty','vendor_id','notes'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.updated_at = new Date().toISOString();

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE filament_spools SET ${sets} WHERE id = ?`).run(...Object.values(updates), existing.id);

  const updated = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(existing.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'filament_spools', recordId: existing.id, oldValue: existing, newValue: updates });
  broadcast('filament:updated', { ...updated, is_low: updated.remaining_g <= updated.reorder_at_g });
  res.json(updated);
});

// POST /api/filament/:id/deduct  — called by Bambu MQTT service after print completion
router.post('/:id/deduct', authenticate, authorize('owner', 'manager'),
  body('grams').isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const spool = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(req.params.id);
    if (!spool) return res.status(404).json({ error: 'Spool not found' });

    const newRemaining = Math.max(0, spool.remaining_g - req.body.grams);
    db.prepare('UPDATE filament_spools SET remaining_g = ?, updated_at = ? WHERE id = ?').run(newRemaining, new Date().toISOString(), spool.id);

    const updated = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(spool.id);
    audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'filament_spools', recordId: spool.id, oldValue: { remaining_g: spool.remaining_g }, newValue: { remaining_g: newRemaining, deducted_g: req.body.grams } });
    broadcast('filament:updated', { ...updated, is_low: updated.remaining_g <= updated.reorder_at_g });

    // Check auto-reorder threshold
    if (updated.remaining_g <= updated.reorder_at_g && updated.auto_reorder) {
      broadcast('filament:reorder_triggered', { spool: updated });
    }

    res.json({ updated_remaining_g: newRemaining, spool: updated });
  }
);

// DELETE /api/filament/:id  — owner only
router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Spool not found' });
  db.prepare('DELETE FROM filament_spools WHERE id = ?').run(existing.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'filament_spools', recordId: existing.id, oldValue: existing });
  broadcast('filament:deleted', { id: existing.id });
  res.json({ message: 'Spool deleted' });
});

module.exports = router;
