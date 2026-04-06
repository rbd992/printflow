// routes/jobs.js — Print Job Queue
const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

function ensureTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_name TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      customer_name TEXT,
      printer_id INTEGER REFERENCES printers(id) ON DELETE SET NULL,
      material TEXT DEFAULT 'PLA',
      color TEXT,
      estimated_grams REAL,
      estimated_duration_min INTEGER,
      actual_duration_min INTEGER,
      file_name TEXT,
      notes TEXT,
      stage TEXT NOT NULL DEFAULT 'queued',
      priority INTEGER NOT NULL DEFAULT 1,
      started_at TEXT,
      completed_at TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

router.get('/', authenticate, (req, res) => {
  try {
    ensureTable();
    const jobs = getDb().prepare(`
      SELECT j.*, p.name as printer_name, o.order_number
      FROM print_jobs j
      LEFT JOIN printers p ON j.printer_id = p.id
      LEFT JOIN orders o ON j.order_id = o.id
      ORDER BY j.priority ASC, j.created_at DESC
    `).all();
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    ensureTable();
    const { job_name, order_id, customer_name, printer_id, material, color,
      estimated_grams, estimated_duration_min, file_name, notes, stage, priority } = req.body;
    if (!job_name) return res.status(400).json({ error: 'job_name is required' });
    const result = getDb().prepare(`
      INSERT INTO print_jobs (job_name, order_id, customer_name, printer_id, material, color,
        estimated_grams, estimated_duration_min, file_name, notes, stage, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(job_name, order_id || null, customer_name || null, printer_id || null,
      material || 'PLA', color || null, estimated_grams || null,
      estimated_duration_min || null, file_name || null, notes || null,
      stage || 'queued', priority || 1, req.user.id);
    const job = getDb().prepare('SELECT * FROM print_jobs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    ensureTable();
    const { job_name, order_id, customer_name, printer_id, material, color,
      estimated_grams, estimated_duration_min, actual_duration_min, file_name,
      notes, stage, priority, started_at, completed_at } = req.body;
    getDb().prepare(`
      UPDATE print_jobs SET
        job_name = ?, order_id = ?, customer_name = ?, printer_id = ?,
        material = ?, color = ?, estimated_grams = ?, estimated_duration_min = ?,
        actual_duration_min = ?, file_name = ?, notes = ?, stage = ?, priority = ?,
        started_at = ?, completed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(job_name, order_id || null, customer_name || null, printer_id || null,
      material || 'PLA', color || null, estimated_grams || null,
      estimated_duration_min || null, actual_duration_min || null,
      file_name || null, notes || null, stage || 'queued',
      priority || 1, started_at || null, completed_at || null, req.params.id);
    const job = getDb().prepare('SELECT * FROM print_jobs WHERE id = ?').get(req.params.id);
    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    ensureTable();
    getDb().prepare('DELETE FROM print_jobs WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
