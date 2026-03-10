const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb } = require('../services/db');
const { decrypt } = require('../services/crypto');
const { authenticate } = require('../middleware/auth');

// GET /api/calendar/:appId?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:appId', authenticate, async (req, res) => {
  try {
    const { appId } = req.params;
    const { start, end } = req.query;

    const db = getDb();
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const cred = app.credential ? JSON.parse(decrypt(app.credential)) : {};
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (cred.api_key) {
      headers['X-Api-Key'] = cred.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    if (app.type === 'sonarr') {
      const calRes = await client.get('/api/v3/calendar', {
        params: { start, end, includeSeries: true }
      });
      const episodes = calRes.data.map(ep => ({
        series: ep.series?.title || 'Unknown',
        episode: `S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}`,
        title: ep.title || '',
        airDate: ep.airDate,
        network: ep.series?.network || '',
      }));
      return res.json(episodes);
    }

    if (app.type === 'radarr') {
      const calRes = await client.get('/api/v3/calendar', {
        params: { start, end }
      });
      const movies = calRes.data.map(m => {
        const rawDate = m.inCinemas || m.digitalRelease || m.physicalRelease || null;
        return {
          title: m.title || 'Unknown',
          releaseDate: rawDate,
          releaseType: m.inCinemas && new Date(m.inCinemas) >= new Date(start) ? 'cinema'
            : m.digitalRelease && new Date(m.digitalRelease) >= new Date(start) ? 'digital'
            : 'physical',
        };
      });
      return res.json(movies);
    }

    res.status(400).json({ error: 'Unsupported app type for calendar' });
  } catch (err) {
    console.error(`[Calendar] Error for ${req.params.appId}: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

module.exports = router;
