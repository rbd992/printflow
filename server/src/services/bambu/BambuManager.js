'use strict';
/**
 * BambuManager
 * Singleton that manages one BambuClient per registered printer.
 * Listens to state events, broadcasts to all Socket.io clients,
 * and triggers filament auto-deduction on print completion.
 */

const BambuClient = require('./BambuClient');
const { getDb }   = require('../../db/connection');
const { audit }   = require('../../db/audit');
const { broadcast } = require('../socket');
const logger      = require('../logger');

class BambuManager {
  constructor() {
    this._clients = new Map();   // serial → BambuClient
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /** Load all active printers from DB and connect to each. */
  async startAll() {
    const db = getDb();
    const printers = db.prepare('SELECT * FROM printers WHERE is_active = 1').all();
    logger.info(`[BambuManager] Starting ${printers.length} printer connection(s)`);

    // Try to load cloud credentials for cloud-mode printers
    let cloudCreds = null;
    try {
      db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)");
      const row = db.prepare("SELECT value FROM settings WHERE key = 'bambu_cloud_credentials'").get();
      if (row) cloudCreds = JSON.parse(row.value);
    } catch {}

    for (const printer of printers) {
      const mode = printer.connection_mode || 'lan';
      if (mode === 'cloud' && cloudCreds) {
        this.connectCloud(printer, cloudCreds.uid, cloudCreds.token);
      } else {
        this.connect(printer);
      }
    }
  }

  /** Connect (or reconnect) a single printer via LAN mode. */
  connect(printer) {
    const { serial, ip_address, access_code, name } = printer;

    if (this._clients.has(serial)) {
      logger.info(`[BambuManager] Already connected to ${serial} — reconnecting`);
      this._clients.get(serial).disconnect();
    }

    const client = new BambuClient({ serial, name, mode: 'lan', ip: ip_address, accessCode: access_code });
    this._wireClient(client, serial, name);
    this._clients.set(serial, client);
    client.connect();
    return client;
  }

  /** Connect a printer via Bambu Cloud MQTT. */
  connectCloud(printer, uid, token) {
    const { serial, name } = printer;
    if (this._clients.has(serial)) {
      this._clients.get(serial).disconnect();
    }
    const client = new BambuClient({ serial, name, mode: 'cloud', uid, token });
    this._wireClient(client, serial, name);
    this._clients.set(serial, client);
    client.connect();
    return client;
  }

  /** Wire event listeners to a BambuClient instance. */
  _wireClient(client, serial, name) {

    client.on('state', (state) => {
      broadcast('printer:status', state);
      this._syncAmsTrays(state);
    });
    client.on('print_complete', (data) => {
      logger.info(`[BambuManager] Print complete on ${serial}: ${data.filename}`);
      this._handlePrintComplete(data);
    });
    client.on('connected', ({ mode }) => {
      broadcast('printer:online', { serial, name, mode });
    });
    client.on('reconnecting', () => { broadcast('printer:reconnecting', { serial }); });
    client.on('error', (err) => {
      logger.error(`[BambuManager] Error on ${serial}: ${err.message}`);
      broadcast('printer:error', { serial, error: err.message });
    });
  }

  /** Disconnect and remove a printer. */
  disconnect(serial) {
    const client = this._clients.get(serial);
    if (client) {
      client.disconnect();
      this._clients.delete(serial);
      logger.info(`[BambuManager] Disconnected ${serial}`);
    }
  }

  /** Disconnect all printers (on server shutdown). */
  stopAll() {
    for (const [serial, client] of this._clients) {
      client.disconnect();
    }
    this._clients.clear();
    logger.info('[BambuManager] All printers disconnected');
  }

  /** Get current state snapshot for all printers. */
  getAllStates() {
    const states = {};
    for (const [serial, client] of this._clients) {
      states[serial] = client.currentState;
    }
    return states;
  }

  getClient(serial) {
    return this._clients.get(serial);
  }

  // ── Filament auto-deduction ───────────────────────────────────

  _handlePrintComplete({ serial, filename, filament_used_g, ams }) {
    if (filament_used_g <= 0) return;

    const db = getDb();

    // Find which AMS tray was active (tray with loaded=true) and
    // match it to a filament spool by tag_uid or material+color heuristic
    const activeTray = this._findActiveTray(ams);

    let spoolId = null;
    if (activeTray?.tag_uid) {
      const spool = db.prepare(
        'SELECT id FROM filament_spools WHERE bambu_tag_uid = ? LIMIT 1'
      ).get(activeTray.tag_uid);
      spoolId = spool?.id;
    }

    // Fallback: match by material + color
    if (!spoolId && activeTray?.material) {
      const spool = db.prepare(
        `SELECT id FROM filament_spools
         WHERE material = ? AND LOWER(color_hex) = LOWER(?)
         ORDER BY remaining_g DESC LIMIT 1`
      ).get(activeTray.material, activeTray.color || '');
      spoolId = spool?.id;
    }

    if (!spoolId) {
      logger.warn(`[BambuManager] Could not match active tray to a spool — skipping deduction`);
      broadcast('printer:deduction_skipped', { serial, filename, filament_used_g, reason: 'no_spool_match' });
      return;
    }

    const spool = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(spoolId);
    if (!spool) return;

    const newRemaining = Math.max(0, parseFloat((spool.remaining_g - filament_used_g).toFixed(1)));
    db.prepare(
      `UPDATE filament_spools
       SET remaining_g = ?, updated_at = ? WHERE id = ?`
    ).run(newRemaining, new Date().toISOString(), spoolId);

    const updated = db.prepare('SELECT * FROM filament_spools WHERE id = ?').get(spoolId);
    const isLow   = updated.remaining_g <= updated.reorder_at_g;

    audit({
      userId:    null,
      userName:  `Bambu:${serial}`,
      action:    'update',
      tableName: 'filament_spools',
      recordId:  spoolId,
      oldValue:  { remaining_g: spool.remaining_g },
      newValue:  { remaining_g: newRemaining, deducted_g: filament_used_g, source: 'mqtt_print_complete' },
    });

    broadcast('filament:updated', { ...updated, is_low: isLow, pct_remaining: Math.round((newRemaining / updated.full_weight_g) * 100) });
    broadcast('printer:filament_deducted', { serial, spool_id: spoolId, deducted_g: filament_used_g, remaining_g: newRemaining });

    logger.info(`[BambuManager] Deducted ${filament_used_g}g from spool ${spoolId} (${spool.brand} ${spool.color_name}) → ${newRemaining}g remaining`);

    // Auto-reorder check
    if (isLow && updated.auto_reorder) {
      broadcast('filament:reorder_triggered', { spool: updated, source: 'mqtt_print_complete' });
      logger.info(`[BambuManager] Auto-reorder triggered for spool ${spoolId}`);
    }
  }

  _findActiveTray(ams) {
    if (!ams?.length) return null;
    for (const unit of ams) {
      for (const tray of unit.trays || []) {
        if (tray.loaded) return tray;
      }
    }
    // If none marked loaded, return first non-empty tray
    for (const unit of ams) {
      for (const tray of unit.trays || []) {
        if (tray.material) return tray;
      }
    }
    return null;
  }

  // ── AMS tray DB sync ──────────────────────────────────────────

  _syncAmsTrays(state) {
    if (!state.ams?.length) return;
    const db = getDb();

    for (const unit of state.ams) {
      for (const tray of unit.trays) {
        // Upsert each tray state
        db.prepare(`
          INSERT INTO ams_trays
            (printer_serial, ams_unit, tray_index, material, color_hex, tray_type, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(printer_serial, ams_unit, tray_index) DO UPDATE SET
            material   = excluded.material,
            color_hex  = excluded.color_hex,
            tray_type  = excluded.tray_type,
            updated_at = excluded.updated_at
        `).run(
          state.serial, unit.unit, tray.index,
          tray.material || null, tray.color || null, tray.material || null,
          new Date().toISOString(),
        );
      }
    }
  }
}

// Export singleton
module.exports = new BambuManager();
