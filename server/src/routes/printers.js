const router = require('express').Router();
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

// GET /api/printers
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const printers = db.prepare('SELECT * FROM printers WHERE is_active = 1 ORDER BY name').all();
  // Attach AMS tray data
  const result = printers.map(p => {
    const trays = db.prepare(`
      SELECT at.*, f.color_name, f.material, f.brand, f.color_hex as spool_color
      FROM ams_trays at
      LEFT JOIN filament_spools f ON at.filament_id = f.id
      WHERE at.printer_serial = ?
      ORDER BY at.ams_unit, at.tray_index
    `).all(p.serial);
    return { ...p, access_code: undefined, trays };  // never expose access_code to client
  });
  res.json(result);
});

// POST /api/printers  — owner only
router.post('/', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const { name, model, serial, ip_address, access_code, has_ams, ams_count, notes, camera_ip, camera_access_code } = req.body;
  if (!name || !serial || !ip_address || !access_code) {
    return res.status(400).json({ error: 'name, serial, ip_address, access_code required' });
  }
  const result = db.prepare(`
    INSERT INTO printers (name, model, serial, ip_address, access_code, has_ams, ams_count, notes, camera_ip, camera_access_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, model ?? 'Unknown', serial, ip_address, access_code, has_ams ? 1 : 0, ams_count ?? 0, notes ?? null, camera_ip ?? null, camera_access_code ?? null);
  const printer = db.prepare('SELECT id, name, model, serial, ip_address, has_ams, ams_count, is_active, notes FROM printers WHERE id = ?').get(result.lastInsertRowid);
  audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'printers', recordId: printer.id, newValue: printer });
  broadcast('printer:registered', printer);
  res.status(201).json(printer);
});

// PATCH /api/printers/:serial/tray  — update AMS tray from MQTT (internal use)
router.patch('/:serial/tray', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const { ams_unit, tray_index, filament_id, material, color_hex, tray_type } = req.body;
  db.prepare(`
    INSERT INTO ams_trays (printer_serial, ams_unit, tray_index, filament_id, material, color_hex, tray_type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(printer_serial, ams_unit, tray_index) DO UPDATE SET
      filament_id = excluded.filament_id,
      material    = excluded.material,
      color_hex   = excluded.color_hex,
      tray_type   = excluded.tray_type,
      updated_at  = excluded.updated_at
  `).run(req.params.serial, ams_unit ?? 0, tray_index, filament_id ?? null, material ?? null, color_hex ?? null, tray_type ?? null, new Date().toISOString());
  broadcast('printer:tray_updated', { serial: req.params.serial, ams_unit, tray_index });
  res.json({ ok: true });
});

// DELETE /api/printers/:id  — owner only (soft delete)
router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE printers SET is_active = 0 WHERE id = ?').run(req.params.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'printers', recordId: req.params.id });
  res.json({ message: 'Printer removed' });
});

module.exports = router;
