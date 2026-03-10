const axios = require('axios');

module.exports = {
  type: 'adguard',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.username && credential?.password) {
      headers['Authorization'] = 'Basic ' +
        Buffer.from(`${credential.username}:${credential.password}`).toString('base64');
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const [statsRes, statusRes] = await Promise.all([
      client.get('/control/stats'),
      client.get('/control/status'),
    ]);

    const stats = statsRes.data;
    const status = statusRes.data;

    // Use cumulative totals to match AdGuard's own dashboard
    const totalQueries = stats.num_dns_queries || 0;
    const totalBlocked = stats.num_blocked_filtering || 0;
    const blockedPct = totalQueries > 0
      ? Math.round((totalBlocked / totalQueries) * 10000) / 100
      : 0;

    // Per-day arrays for sparkline
    const dailyQueries = stats.dns_queries || [];

    return {
      status: 'online',
      filtering_enabled: status.protection_enabled,
      dns_queries: totalQueries,
      blocked_queries: totalBlocked,
      blocked_percentage: blockedPct,
      avg_processing_time: Math.round((stats.avg_processing_time || 0) * 1000 * 100) / 100,
      rules_count: status.num_rules || 0,
      version: status.version,
      clients: status.num_clients || 0,
      query_history: dailyQueries.slice(-14),
    };
  },

  async action(app, credential, body) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.username && credential?.password) {
      headers['Authorization'] = 'Basic ' +
        Buffer.from(`${credential.username}:${credential.password}`).toString('base64');
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    if (body.action === 'toggle_filtering') {
      const statusRes = await client.get('/control/status');
      const enabled = statusRes.data.protection_enabled;
      await client.post('/control/dns_config', { protection_enabled: !enabled });
      return { filtering_enabled: !enabled };
    }

    throw new Error(`Unknown action: ${body.action}`);
  },

  historyKeys: ['dns_queries', 'blocked_queries', 'blocked_percentage'],
};
