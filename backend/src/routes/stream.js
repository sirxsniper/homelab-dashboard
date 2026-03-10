const express = require('express');
const { EventEmitter } = require('events');
const { verifyAccessToken } = require('../services/jwt');
const { getDb } = require('../services/db');
const historyStore = require('../services/historyStore');

const router = express.Router();
const emitter = new EventEmitter();
emitter.setMaxListeners(100);

let clients = [];
const MAX_CLIENTS = 20;

// Build full stats payload from DB
function getAllStats() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.app_id, s.data, s.updated_at, a.name, a.type, a.icon, a.url, a.open_url, a.category, a.enabled, a.sort_order
      FROM stats_latest s
      JOIN apps a ON a.id = s.app_id
      WHERE a.enabled = 1
      ORDER BY a.sort_order, a.name
    `).all();
    return rows.map(row => {
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
      // Attach sparkline history for server-type apps
      if (row.type === 'proxmox' || row.type === 'unraid' || row.type === 'linux') {
        entry.sparkline = {
          cpu: historyStore.get(`${row.app_id}_cpu`),
          ram: historyStore.get(`${row.app_id}_ram`),
        };
      }
      return entry;
    });
  } catch {
    return [];
  }
}

function sendToClient(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {}
}

router.get('/', (req, res) => {
  // Authenticate via query param (EventSource doesn't support headers)
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.partial) {
      return res.status(401).json({ error: 'Complete 2FA verification first' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Enforce connection limit to prevent DoS
  if (clients.length >= MAX_CLIENTS) {
    return res.status(503).json({ error: 'Too many connections' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send full stats immediately on connect
  const stats = getAllStats();
  sendToClient(res, { type: 'stats', payload: stats });

  // Regular 3-second push
  const interval = setInterval(() => {
    if (req.closed) { clearInterval(interval); return; }
    const stats = getAllStats();
    sendToClient(res, { type: 'stats', payload: stats });
  }, 3000);

  // Listen for instant pushes (state changes)
  const onPush = (data) => {
    if (!req.closed) sendToClient(res, data);
  };
  emitter.on('push', onPush);

  // Heartbeat every 20s to keep connection alive through proxies/browsers
  const heartbeat = setInterval(() => {
    if (req.closed) { clearInterval(heartbeat); return; }
    try { res.write(': heartbeat\n\n'); } catch {}
  }, 20000);

  clients.push(res);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    emitter.off('push', onPush);
    clients = clients.filter(c => c !== res);
  });
});

// Broadcast to all clients (called from poller on every poll)
function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try { client.write(msg); } catch {}
  }
}

// Instant push for state changes (bypasses 3s interval)
function pushNow() {
  const stats = getAllStats();
  emitter.emit('push', { type: 'stats', payload: stats });
}

module.exports = { router, broadcast, pushNow, emitter };
