const express = require('express');
const { getDb } = require('../services/db');
const { authenticate } = require('../middleware/auth');
const historyStore = require('../services/historyStore');

const router = express.Router();

// GET /api/stats — all latest stats
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.app_id, s.data, s.updated_at, a.name, a.type, a.icon, a.url, a.open_url, a.category, a.enabled, a.sort_order
    FROM stats_latest s
    JOIN apps a ON a.id = s.app_id
    WHERE a.enabled = 1
    ORDER BY a.sort_order, a.name
  `).all();

  const stats = rows.map(row => {
    const entry = {
      app_id: row.app_id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      url: row.url,
      open_url: row.open_url,
      category: row.category,
      sort_order: row.sort_order || 0,
      data: JSON.parse(row.data),
      updated_at: row.updated_at,
    };
    if (row.type === 'proxmox' || row.type === 'unraid' || row.type === 'linux') {
      entry.sparkline = {
        cpu: historyStore.get(`${row.app_id}_cpu`),
        ram: historyStore.get(`${row.app_id}_ram`),
      };
    }
    return entry;
  });

  res.json(stats);
});

// GET /api/stats/:id — stats for one app
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.app_id, s.data, s.updated_at, a.name, a.type, a.icon
    FROM stats_latest s
    JOIN apps a ON a.id = s.app_id
    WHERE s.app_id = ?
  `).get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Stats not found' });
  }

  res.json({
    app_id: row.app_id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    data: JSON.parse(row.data),
    updated_at: row.updated_at,
  });
});

// GET /api/stats/:id/history — last 24h history
router.get('/:id/history', authenticate, (req, res) => {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - 86400;

  const rows = db.prepare(
    'SELECT data, recorded_at FROM stats_history WHERE app_id = ? AND recorded_at > ? ORDER BY recorded_at ASC'
  ).all(req.params.id, cutoff);

  const history = rows.map(row => ({
    data: JSON.parse(row.data),
    recorded_at: row.recorded_at,
  }));

  res.json(history);
});

module.exports = router;
