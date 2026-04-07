const { getDb } = require('./connection');
const logger = require('../services/logger');

const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('owner','manager','operator')),
        is_active     INTEGER NOT NULL DEFAULT 1,
        created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
        last_login    DATETIME
      );
      CREATE TABLE IF NOT EXISTS vendors (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        website_url TEXT,
        notes       TEXT,
        created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS filament_spools (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        brand           TEXT NOT NULL,
        material        TEXT NOT NULL CHECK(material IN ('PLA','PETG','ABS','ASA','TPU','PA','PC','HIPS','PVA','Other')),
        color_name      TEXT NOT NULL,
        color_hex       TEXT NOT NULL DEFAULT '#888888',
        diameter_mm     REAL NOT NULL DEFAULT 1.75,
        full_weight_g   INTEGER NOT NULL DEFAULT 1000,
        remaining_g     REAL NOT NULL,
        cost_cad        REAL NOT NULL DEFAULT 0,
        reorder_at_g    INTEGER NOT NULL DEFAULT 200,
        auto_reorder    INTEGER NOT NULL DEFAULT 0,
        reorder_qty     INTEGER NOT NULL DEFAULT 1,
        vendor_id       INTEGER REFERENCES vendors(id),
        bambu_tag_uid   TEXT,
        notes           TEXT,
        created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at      DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS parts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        category    TEXT NOT NULL,
        description TEXT,
        quantity    INTEGER NOT NULL DEFAULT 0,
        reorder_at  INTEGER NOT NULL DEFAULT 1,
        unit_cost   REAL,
        vendor_id   INTEGER REFERENCES vendors(id),
        created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        printer_serial  TEXT NOT NULL,
        printer_name    TEXT NOT NULL,
        task_name       TEXT NOT NULL,
        interval_days   INTEGER NOT NULL,
        last_done_at    DATE,
        next_due_at     DATE,
        notes           TEXT,
        created_at      DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS orders (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number     TEXT NOT NULL UNIQUE,
        customer_name    TEXT NOT NULL,
        customer_email   TEXT,
        platform         TEXT NOT NULL CHECK(platform IN ('etsy','amazon','direct','other')),
        description      TEXT NOT NULL,
        filament_id      INTEGER REFERENCES filament_spools(id),
        filament_used_g  REAL,
        price_cad        REAL NOT NULL DEFAULT 0,
        shipping_cad     REAL NOT NULL DEFAULT 0,
        status           TEXT NOT NULL DEFAULT 'new'
                         CHECK(status IN ('new','queued','printing','qc','packed','shipped','delivered','cancelled')),
        due_date         DATE,
        printer_serial   TEXT,
        tracking_number  TEXT,
        carrier          TEXT,
        notes            TEXT,
        created_by       INTEGER REFERENCES users(id),
        created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at       DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        date         DATE NOT NULL,
        description  TEXT NOT NULL,
        category     TEXT NOT NULL CHECK(category IN ('sales','materials','shipping','fees','maintenance','other')),
        type         TEXT NOT NULL CHECK(type IN ('income','expense')),
        amount_cad   REAL NOT NULL,
        hst_amount   REAL NOT NULL DEFAULT 0,
        order_id     INTEGER REFERENCES orders(id),
        created_by   INTEGER REFERENCES users(id),
        created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS printers (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        model        TEXT NOT NULL,
        serial       TEXT NOT NULL UNIQUE,
        ip_address   TEXT NOT NULL,
        access_code  TEXT NOT NULL,
        has_ams      INTEGER NOT NULL DEFAULT 0,
        ams_count    INTEGER NOT NULL DEFAULT 0,
        is_active    INTEGER NOT NULL DEFAULT 1,
        notes        TEXT,
        created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ams_trays (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        printer_serial  TEXT NOT NULL REFERENCES printers(serial),
        ams_unit        INTEGER NOT NULL DEFAULT 0,
        tray_index      INTEGER NOT NULL,
        filament_id     INTEGER REFERENCES filament_spools(id),
        material        TEXT,
        color_hex       TEXT,
        tray_type       TEXT,
        updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),
        UNIQUE(printer_serial, ams_unit, tray_index)
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER REFERENCES users(id),
        user_name   TEXT,
        action      TEXT NOT NULL CHECK(action IN ('create','update','delete','login','logout')),
        table_name  TEXT,
        record_id   INTEGER,
        old_value   TEXT,
        new_value   TEXT,
        ip_address  TEXT,
        created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        applied_at  DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_due_date   ON orders(due_date);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_filament_material ON filament_spools(material);
    `,
  },
  {
    version: 2,
    name: 'default_vendors',
    sql: `
      INSERT OR IGNORE INTO vendors (name, website_url, notes) VALUES
        ('Bambu Lab',            'https://bambulab.com',              'Primary printer vendor'),
        ('Polymaker',            'https://polymaker.com',             'Engineering filaments'),
        ('Hatchbox',             'https://hatchbox3d.com',            'Reliable PLA/PETG'),
        ('eSUN',                 'https://esun3d.com',                'Budget-friendly, wide color range'),
        ('3D Printing Canada',   'https://3dprintingcanada.com',      'Canadian distributor'),
        ('Amazon Canada',        'https://amazon.ca',                 'Prime shipping');
    `,
  },
  {
    version: 3,
    name: 'add_camera_fields_to_printers',
    sql: `
      ALTER TABLE printers ADD COLUMN camera_ip TEXT;
      ALTER TABLE printers ADD COLUMN camera_access_code TEXT;
      ALTER TABLE printers ADD COLUMN connection_mode TEXT DEFAULT 'lan';
      ALTER TABLE printers ADD COLUMN bambu_uid TEXT;
    `,
  },
  {
    version: 4,
    name: 'order_payment_and_historical_tracking',
    sql: `
      ALTER TABLE orders ADD COLUMN paid_at DATETIME;
      ALTER TABLE orders ADD COLUMN payment_method TEXT CHECK(payment_method IN ('cash','card','etransfer','paypal','other'));
      ALTER TABLE orders ADD COLUMN is_historical INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN historical_date DATE;
      CREATE INDEX IF NOT EXISTS idx_orders_paid_at    ON orders(paid_at);
      CREATE INDEX IF NOT EXISTS idx_orders_historical ON orders(is_historical);
    `,
  },
  {
    version: 5,
    name: 'widen_platform_field',
    sql: `
      CREATE TABLE IF NOT EXISTS orders_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number     TEXT NOT NULL UNIQUE,
        customer_name    TEXT NOT NULL,
        customer_email   TEXT,
        platform         TEXT NOT NULL DEFAULT 'direct',
        description      TEXT NOT NULL,
        filament_id      INTEGER REFERENCES filament_spools(id),
        filament_used_g  REAL,
        price_cad        REAL NOT NULL DEFAULT 0,
        shipping_cad     REAL NOT NULL DEFAULT 0,
        status           TEXT NOT NULL DEFAULT 'new'
                         CHECK(status IN ('new','queued','printing','qc','packed','shipped','delivered','cancelled')),
        due_date         DATE,
        printer_serial   TEXT,
        tracking_number  TEXT,
        carrier          TEXT,
        notes            TEXT,
        paid_at          DATETIME,
        payment_method   TEXT,
        is_historical    INTEGER NOT NULL DEFAULT 0,
        historical_date  DATE,
        created_by       INTEGER REFERENCES users(id),
        created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at       DATETIME NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO orders_new SELECT
        id, order_number, customer_name, customer_email, platform, description,
        filament_id, filament_used_g, price_cad, shipping_cad, status, due_date,
        printer_serial, tracking_number, carrier, notes, paid_at, payment_method,
        is_historical, historical_date, created_by, created_at, updated_at
      FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;
      CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_due_date   ON orders(due_date);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_paid_at    ON orders(paid_at);
      CREATE INDEX IF NOT EXISTS idx_orders_historical ON orders(is_historical);
    `,
  },
  {
    version: 6,
    name: 'expand_order_statuses',
    sql: `
      -- Recreate orders table with full expanded status list
      PRAGMA foreign_keys = OFF;

      CREATE TABLE orders_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number     TEXT NOT NULL UNIQUE,
        customer_name    TEXT NOT NULL,
        customer_email   TEXT,
        platform         TEXT NOT NULL DEFAULT 'direct',
        description      TEXT NOT NULL,
        filament_id      INTEGER REFERENCES filament_spools(id),
        filament_used_g  REAL,
        price_cad        REAL NOT NULL DEFAULT 0,
        shipping_cad     REAL NOT NULL DEFAULT 0,
        status           TEXT NOT NULL DEFAULT 'new'
                         CHECK(status IN (
                           'new','queued','quoted','confirmed',
                           'printing','printed','post-processing',
                           'qc','packed','shipped','delivered','paid','cancelled'
                         )),
        due_date         DATE,
        printer_serial   TEXT,
        tracking_number  TEXT,
        carrier          TEXT,
        notes            TEXT,
        paid_at          DATETIME,
        payment_method   TEXT CHECK(payment_method IN ('cash','card','etransfer','paypal','other')),
        is_historical    INTEGER NOT NULL DEFAULT 0,
        historical_date  DATE,
        created_by       INTEGER REFERENCES users(id),
        created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at       DATETIME NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO orders_new SELECT
        id, order_number, customer_name, customer_email, platform, description,
        filament_id, filament_used_g, price_cad, shipping_cad,
        CASE status WHEN 'delivered' THEN 'paid' ELSE status END,
        due_date, printer_serial, tracking_number, carrier, notes,
        paid_at, payment_method, is_historical, historical_date,
        created_by, created_at, updated_at
      FROM orders;

      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;

      CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_due_date   ON orders(due_date);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_paid_at    ON orders(paid_at);
      CREATE INDEX IF NOT EXISTS idx_orders_historical ON orders(is_historical);

      PRAGMA foreign_keys = ON;
    `,
  },
  {
    version: 7,
    name: 'add_connection_type_to_printers',
    sql: `
      ALTER TABLE printers ADD COLUMN connection_type TEXT NOT NULL DEFAULT 'bambu_lan';
    `,
  },
  {
    version: 8,
    name: 'recurring_orders_and_receipt_uploads',
    sql: `
      ALTER TABLE orders ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN recurring_interval TEXT CHECK(recurring_interval IN ('weekly','biweekly','monthly','quarterly')) DEFAULT NULL;
      ALTER TABLE orders ADD COLUMN recurring_next_date DATE DEFAULT NULL;
      ALTER TABLE orders ADD COLUMN recurring_parent_id INTEGER REFERENCES orders(id) DEFAULT NULL;
      ALTER TABLE transactions ADD COLUMN receipt_url TEXT DEFAULT NULL;
      ALTER TABLE transactions ADD COLUMN receipt_filename TEXT DEFAULT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_recurring     ON orders(is_recurring);
      CREATE INDEX IF NOT EXISTS idx_orders_recurring_next ON orders(recurring_next_date);
    `,
  },
];

function runMigrations() {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT (datetime('now'))
  )`);

  const applied = db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version);

  for (const m of migrations) {
    if (applied.includes(m.version)) continue;
    logger.info(`Applying migration ${m.version}: ${m.name}`);
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
    })();
    logger.info(`Migration ${m.version} applied.`);
  }
}

if (require.main === module) {
  require('dotenv').config();
  runMigrations();
  logger.info('All migrations complete.');
}

module.exports = { runMigrations };
