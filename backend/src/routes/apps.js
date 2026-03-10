const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');
const { encrypt, decrypt } = require('../services/crypto');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { refreshApp } = require('../services/poller');

const router = express.Router();

// GET /api/apps — list all apps
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const apps = db.prepare('SELECT * FROM apps ORDER BY sort_order, name').all();

  // Strip credentials for non-admin users
  const sanitized = apps.map(app => {
    const { credential, ...rest } = app;
    if (req.user.role === 'admin') {
      rest.has_credential = !!credential;
    }
    return rest;
  });

  res.json(sanitized);
});

// POST /api/apps — add new app
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, icon, url, open_url, category, type, auth_type, credential, poll_interval, sort_order } = req.body;

  if (!name || !url || !category || !type) {
    return res.status(400).json({ error: 'name, url, category, and type are required' });
  }

  const db = getDb();
  const id = uuidv4();

  let encryptedCred = null;
  if (credential) {
    encryptedCred = encrypt(JSON.stringify(credential));
  }

  db.prepare(`
    INSERT INTO apps (id, name, icon, url, open_url, category, type, auth_type, credential, poll_interval, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    icon || '🖥️',
    url,
    open_url || null,
    category,
    type,
    auth_type || 'none',
    encryptedCred,
    poll_interval || 30,
    sort_order || 0
  );

  // Start polling for the new app
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
  refreshApp(id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'app_created', `name: ${name}`, req.ip);

  const { credential: _, ...safe } = app;
  res.status(201).json(safe);
});

// PUT /api/apps/:id — update app config
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'App not found' });
  }

  const { name, icon, url, open_url, category, type, auth_type, credential, poll_interval, enabled, sort_order } = req.body;

  let encryptedCred = existing.credential;
  if (credential !== undefined) {
    encryptedCred = credential ? encrypt(JSON.stringify(credential)) : null;
  }

  db.prepare(`
    UPDATE apps SET
      name = ?, icon = ?, url = ?, open_url = ?, category = ?, type = ?,
      auth_type = ?, credential = ?, poll_interval = ?, enabled = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    icon ?? existing.icon,
    url ?? existing.url,
    open_url !== undefined ? (open_url || null) : existing.open_url,
    category ?? existing.category,
    type ?? existing.type,
    auth_type ?? existing.auth_type,
    encryptedCred,
    poll_interval ?? existing.poll_interval,
    enabled ?? existing.enabled,
    sort_order ?? existing.sort_order,
    req.params.id
  );

  refreshApp(req.params.id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'app_updated', `id: ${req.params.id}`, req.ip);

  const updated = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  const { credential: _, ...safe } = updated;
  res.json(safe);
});

// DELETE /api/apps/:id — remove app
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  const { stopApp } = require('../services/poller');
  stopApp(req.params.id);

  db.prepare('DELETE FROM apps WHERE id = ?').run(req.params.id);

  db.prepare(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, 'app_deleted', `name: ${app.name}`, req.ip);

  res.json({ message: 'App deleted' });
});

// GET /api/apps/:id/credential — fetch decrypted credential (admin only)
router.get('/:id/credential', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT credential FROM apps WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  if (!app.credential) return res.json({});
  try {
    const cred = JSON.parse(decrypt(app.credential));
    res.json(cred);
  } catch {
    res.json({});
  }
});

// POST /api/apps/:id/action — trigger quick action
router.post('/:id/action', authenticate, requireAdmin, async (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  const connectors = require('../connectors');
  const connector = connectors.get(app.type);
  if (!connector || !connector.action) {
    return res.status(400).json({ error: 'This app type does not support actions' });
  }

  let credential = null;
  if (app.credential) {
    credential = JSON.parse(decrypt(app.credential));
  }

  try {
    const result = await connector.action(app, credential, req.body);
    db.prepare(
      'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, 'app_action', `app: ${app.name}, action: ${req.body.action}`, req.ip);
    res.json(result);
  } catch (err) {
    console.error(`[Action] Error on ${app.name}: ${err.message}`);
    res.status(500).json({ error: 'Action failed' });
  }
});

module.exports = router;
