const express = require('express');
const { getDb } = require('../services/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// GET /api/audit — list audit log entries
router.get('/', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const rows = db.prepare(`
    SELECT a.*, u.username
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get();

  res.json({ entries: rows, total: total.count });
});

module.exports = router;
