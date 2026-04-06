const { getDb } = require('./connection');

/**
 * Write an entry to audit_log.
 * @param {object} opts
 * @param {number|null} opts.userId
 * @param {string|null} opts.userName
 * @param {'create'|'update'|'delete'|'login'|'logout'} opts.action
 * @param {string|null} [opts.tableName]
 * @param {number|null} [opts.recordId]
 * @param {any} [opts.oldValue]
 * @param {any} [opts.newValue]
 * @param {string|null} [opts.ipAddress]
 */
function audit(opts) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log
        (user_id, user_name, action, table_name, record_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      opts.userId   ?? null,
      opts.userName ?? null,
      opts.action,
      opts.tableName ?? null,
      opts.recordId  ?? null,
      opts.oldValue  != null ? JSON.stringify(opts.oldValue)  : null,
      opts.newValue  != null ? JSON.stringify(opts.newValue)  : null,
      opts.ipAddress ?? null,
    );
  } catch (err) {
    // Audit failures must never crash the main request
    console.error('Audit log error:', err.message);
  }
}

module.exports = { audit };
