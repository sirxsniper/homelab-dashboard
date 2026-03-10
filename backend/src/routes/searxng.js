const express = require('express');
const axios = require('axios');
const { getDb } = require('../services/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/searxng/autocomplete?q=query
router.get('/autocomplete', authenticate, async (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 1) return res.json([]);

  const db = getDb();
  const app = db.prepare(
    "SELECT url FROM apps WHERE type = 'searxng' AND enabled = 1 LIMIT 1"
  ).get();

  if (!app) return res.status(404).json({ error: 'No SearXNG instance configured' });

  const baseUrl = app.url.replace(/\/$/, '');

  try {
    const resp = await axios.get(`${baseUrl}/autocompleter`, {
      params: { q },
      timeout: 3000,
    });
    // SearXNG returns an array of strings
    const suggestions = Array.isArray(resp.data) ? resp.data.slice(0, 8) : [];
    res.json(suggestions);
  } catch {
    res.json([]);
  }
});

module.exports = router;
