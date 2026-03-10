const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { revokeAllUserTokens } = require('../services/jwt');

const router = express.Router();

// GET /api/users/me — get current user info (must be before /:id routes)
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, role, totp_enabled, created_at, last_login FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/users — list users
router.get('/', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, role, totp_enabled, created_at, last_login FROM users ORDER BY created_at'
  ).all();
  res.json(users);
});

// POST /api/users — create user
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }

  const validRoles = ['admin', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);

  db.prepare(
    'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)'
  ).run(id, username, hash, role || 'viewer');

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'user_created', `username: ${username}`, req.ip);

  res.status(201).json({ id, username, role: role || 'viewer' });
});

// PUT /api/users/:id — update user (admin can update any, users can update self)
router.put('/:id', authenticate, (req, res) => {
  const db = getDb();
  const targetId = req.params.id;

  // Non-admins can only update themselves
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Cannot update other users' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { username, password, current_password, role } = req.body;

  // If changing password, require current password for self-updates
  if (password) {
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }
    // Non-admins must provide current password when changing their own password
    if (req.user.id === targetId && req.user.role !== 'admin') {
      if (!current_password || !bcrypt.compareSync(current_password, user.password)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
  }

  // Only admins can change roles
  if (role && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can change roles' });
  }

  // Only admins can change usernames of other users
  if (username && req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Cannot change other users\' usernames' });
  }

  if (username && username !== user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, targetId);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  const newHash = password ? bcrypt.hashSync(password, 12) : user.password;
  const newUsername = username || user.username;
  const newRole = (role && req.user.role === 'admin') ? role : user.role;

  db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?')
    .run(newUsername, newHash, newRole, targetId);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'user_updated', `target: ${newUsername}`, req.ip);

  res.json({ id: targetId, username: newUsername, role: newRole });
});

// PUT /api/users/:id/disable-2fa — admin can disable 2FA for a user
router.put('/:id/disable-2fa', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?')
    .run(req.params.id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, '2fa_disabled', `target: ${user.username}`, req.ip);

  res.json({ message: '2FA disabled' });
});

// DELETE /api/users/:id — remove user
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();

  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  revokeAllUserTokens(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'user_deleted', `username: ${user.username}`, req.ip);

  res.json({ message: 'User deleted' });
});

module.exports = router;
