const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../services/logger');

const DB_PATH = process.env.DB_PATH || './data/printflow.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH, {
      // WAL mode for concurrent reads + writes
      // verbose: process.env.NODE_ENV === 'development' ? logger.debug : undefined,
    });
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.pragma('synchronous = NORMAL');
    _db.pragma('cache_size = -64000'); // 64MB cache
    logger.info(`SQLite connected: ${DB_PATH}`);
  }
  return _db;
}

module.exports = { getDb };
