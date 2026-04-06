const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/connection');
const { audit } = require('../db/audit');
const { authenticate, authorize } = require('../middleware/auth');

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, is_active: u.is_active, created_at: u.created_at, last_login: u.last_login });

// GET /api/users  — owner only
router.get('/', authenticate, authorize('owner'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, is_active, created_at, last_login FROM users ORDER BY created_at').all();
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', authenticate, authorize('owner', 'manager'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, is_active, created_at, last_login FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Managers can only view themselves
  if (req.user.role === 'manager' && req.user.id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(user);
});

// POST /api/users  — owner only
router.post('/', authenticate, authorize('owner'),
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['owner', 'manager', 'operator']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    const db = getDb();

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hash = await bcrypt.hash(password, rounds);

    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, role);

    audit({ userId: req.user.id, userName: req.user.name, action: 'create', tableName: 'users', recordId: result.lastInsertRowid, newValue: { name, email, role } });
    const newUser = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newUser);
  }
);

// PATCH /api/users/:id  — owner can edit anyone; users can edit their own name
router.patch('/:id', authenticate,
  body('name').optional().notEmpty().trim(),
  body('role').optional().isIn(['owner', 'manager', 'operator']),
  body('is_active').optional().isBoolean(),
  async (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const isOwn = req.user.id === targetId;
    if (!isOwn && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    // Only owner can change role or active status
    if (req.user.role === 'owner') {
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.is_active !== undefined) updates.is_active = req.body.is_active ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...Object.values(updates), targetId);

    audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'users', recordId: targetId, oldValue: safeUser(existing), newValue: updates });
    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at, last_login FROM users WHERE id = ?').get(targetId);
    res.json(updated);
  }
);

// DELETE /api/users/:id  — owner only, cannot delete self
router.delete('/:id', authenticate, authorize('owner'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  // Soft-delete: deactivate rather than destroy
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(targetId);
  audit({ userId: req.user.id, userName: req.user.name, action: 'delete', tableName: 'users', recordId: targetId, oldValue: safeUser(existing) });
  res.json({ message: 'User deactivated' });
});

module.exports = router;
