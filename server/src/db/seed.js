require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./connection');
const { runMigrations } = require('./migrate');
const logger = require('../services/logger');

async function seed() {
  runMigrations();
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('owner');
  if (existing) {
    logger.info('Owner account already exists — skipping seed.');
    return;
  }

  const name     = process.env.OWNER_NAME     || 'Owner';
  const email    = process.env.OWNER_EMAIL    || 'owner@printflow.local';
  const password = process.env.OWNER_PASSWORD || 'ChangeMe123!';
  const rounds   = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  const hash = await bcrypt.hash(password, rounds);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'owner')
  `).run(name, email, hash);

  logger.info(`Owner account created: ${email}`);
  logger.warn('IMPORTANT: Change the owner password immediately after first login!');
}

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
