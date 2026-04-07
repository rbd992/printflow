const router = require('express').Router();
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');
const { broadcast } = require('../services/socket');

// GET /api/printers
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const printers = db.prepare('SELECT * FROM printers WHERE is_active = 1 ORDER BY name').all();
  const isOwner = req.user.role === 'owner';
  const result = printers.map(p => {
    const trays = db.prepare(`
      SELECT at.*, f.color_name, f.material, f.brand, f.color_hex as spool_color
      FROM ams_trays at
      LEFT JOIN filament_spools f ON at.filament_id = f.id
      WHERE at.printer_serial = ?
      ORDER BY at.ams_unit, at.tray_index
    `).all(p.serial);
    return {
      ...p,
      // Only expose credentials to owner for editing purposes
      access_code: isOwner ? p.access_code : undefined,
      camera_access_code: isOwner ? p.camera_access_code : undefined,
      trays,
    };
  });
  res.json(result);
});

// POST /api/printers  — owner only
router.post('/', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const { name, model, serial, ip_address, access_code, has_ams, ams_count, notes, camera_ip, camera_access_code, connection_type } = req.body;
  const connType = connection_type || 'bambu_lan';
  // For non-Bambu types, serial and access_code may be optional
  const isBambu = connType.startsWith('bambu');
  if (!name || !serial || !ip_address || (isBambu && !access_code)) {
    return res.status(400).json({ error: 'name, serial, ip_address required (access_code required for Bambu)' });
  }
  const result = db.prepare(`
    INSERT INTO printers (name, model, serial, ip_address, access_code, has_ams, ams_count, notes, camera_ip, camera_access_code, connection_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, model ?? 'Unknown', serial, ip_address, access_code ?? '', has_ams ? 1 : 0, ams_count ?? 0, notes ?? null, camera_ip ?? null, camera_access_code ?? null, connType);
  const printer = db.prepare('SELECT * FROM printers WHERE id = ?').get(result.lastInsertRowid);
  audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'printers', recordId: printer.id, newValue: printer });
  broadcast('printer:registered', printer);
  // Auto-start the right poller
  try {
    if (connType === 'octoprint') {
      require('./octoprint').startPoller(printer);
    } else if (connType === 'klipper') {
      require('./klipper').startPoller(printer);
    } else if (connType === 'bambu_lan') {
      require('../services/bambu/BambuManager').connect(printer);
    }
  } catch (e) { /* poller start failure is non-fatal */ }
  res.status(201).json(printer);
});

// PATCH /api/printers/:id  — edit printer settings (owner only)
router.patch('/:id', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const { name, model, ip_address, access_code, has_ams, ams_count, notes, camera_ip, camera_access_code, connection_type } = req.body;
  const existing = db.prepare('SELECT * FROM printers WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Printer not found' });
  db.prepare(`
    UPDATE printers SET
      name = ?, model = ?, ip_address = ?, access_code = ?,
      has_ams = ?, ams_count = ?, notes = ?,
      camera_ip = ?, camera_access_code = ?, connection_type = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    model ?? existing.model,
    ip_address ?? existing.ip_address,
    access_code ?? existing.access_code,
    has_ams !== undefined ? (has_ams ? 1 : 0) : existing.has_ams,
    ams_count ?? existing.ams_count,
    notes ?? existing.notes,
    camera_ip !== undefined ? (camera_ip || null) : existing.camera_ip,
    camera_access_code !== undefined ? (camera_access_code || null) : existing.camera_access_code,
    connection_type ?? existing.connection_type ?? 'bambu_lan',
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'printers', recordId: req.params.id, newValue: updated });
  broadcast('printer:updated', { id: updated.id, serial: updated.serial });
  res.json({ ok: true, printer: updated });
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
