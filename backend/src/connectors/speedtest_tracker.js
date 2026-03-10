const axios = require('axios');

module.exports = {
  type: 'speedtest_tracker',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['Authorization'] = `Bearer ${credential.api_key}`;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    // Try new API (alexjustesen v0.20+) first, fall back to old API (henrywhitaker3 v1.x)
    let latest, avg, max, min, historyItems, server, version;

    try {
      // New API: /api/v1/results/latest (alexjustesen v0.20+)
      const latestRes = await client.get('/api/v1/results/latest');

      // Guard: old versions return HTML at this path (200 but text/html)
      const ct = latestRes.headers?.['content-type'] || '';
      if (ct.includes('text/html') || typeof latestRes.data !== 'object') {
        throw new Error('Not JSON — fall back to old API');
      }

      const historyRes = await client.get('/api/v1/results', { params: { per_page: 24 } });

      const latestData = latestRes.data?.data || latestRes.data || {};
      historyItems = historyRes.data?.data || [];
      if (!Array.isArray(historyItems)) historyItems = [];

      latest = {
        download: parseFloat(latestData.download) || 0,
        upload: parseFloat(latestData.upload) || 0,
        ping: parseFloat(latestData.ping) || 0,
        created_at: latestData.created_at,
      };
      server = latestData.isp || latestData.server_name || null;

      // Calculate averages from history
      avg = {
        download: historyItems.length > 0
          ? historyItems.reduce((s, r) => s + (parseFloat(r.download) || 0), 0) / historyItems.length
          : latest.download,
        upload: historyItems.length > 0
          ? historyItems.reduce((s, r) => s + (parseFloat(r.upload) || 0), 0) / historyItems.length
          : latest.upload,
      };
      max = { download: latest.download, upload: latest.upload };
      min = { download: latest.download, upload: latest.upload };
    } catch {
      // Old API: /api/speedtest/latest (henrywhitaker3 v1.x)
      const [latestRes, historyRes] = await Promise.all([
        client.get('/api/speedtest/latest'),
        client.get('/api/speedtest'),
      ]);

      const latestData = latestRes.data?.data || {};
      latest = {
        download: parseFloat(latestData.download) || 0,
        upload: parseFloat(latestData.upload) || 0,
        ping: parseFloat(latestData.ping) || 0,
        created_at: latestData.created_at,
      };
      server = latestData.server_name || null;

      avg = latestRes.data?.average || {};
      max = latestRes.data?.maximum || {};
      min = latestRes.data?.minimum || {};

      const pageData = historyRes.data?.data?.data || historyRes.data?.data || [];
      historyItems = Array.isArray(pageData) ? pageData : [];
    }

    // Determine version from meta tag or API structure
    version = null;

    // Time since last test
    let lastTestAgo = 'Unknown';
    if (latest.created_at) {
      const diff = Date.now() - new Date(latest.created_at).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) lastTestAgo = `${mins}m ago`;
      else if (mins < 1440) lastTestAgo = `${Math.floor(mins / 60)}h ago`;
      else lastTestAgo = `${Math.floor(mins / 1440)}d ago`;
    }

    // History for sparkline (download speeds, newest last)
    const history = historyItems
      .map(r => parseFloat(r.download) || 0)
      .reverse();

    return {
      status: 'online',
      download_mbps: parseFloat(latest.download.toFixed(2)),
      upload_mbps: parseFloat(latest.upload.toFixed(2)),
      ping_ms: parseFloat(latest.ping.toFixed(1)),
      avg_download: parseFloat((parseFloat(avg.download) || 0).toFixed(2)),
      avg_upload: parseFloat((parseFloat(avg.upload) || 0).toFixed(2)),
      max_download: parseFloat((parseFloat(max.download) || 0).toFixed(2)),
      min_download: parseFloat((parseFloat(min.download) || 0).toFixed(2)),
      last_test_ago: lastTestAgo,
      history,
      server,
      test_count: historyItems.length,
    };
  },

  historyKeys: ['download_mbps', 'upload_mbps', 'ping_ms'],
};
