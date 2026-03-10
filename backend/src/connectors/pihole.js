const axios = require('axios');

module.exports = {
  type: 'pihole',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const params = {};

    if (credential?.api_token) {
      params.auth = credential.api_token;
    }

    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const summaryRes = await client.get('/admin/api.php', {
      params: { summary: '', ...params },
    });

    const data = summaryRes.data;

    return {
      status: data.status === 'enabled' ? 'online' : 'degraded',
      filtering_enabled: data.status === 'enabled',
      dns_queries: parseInt(data.dns_queries_today) || 0,
      blocked_queries: parseInt(data.ads_blocked_today) || 0,
      blocked_percentage: parseFloat(data.ads_percentage_today) || 0,
      domains_on_blocklist: parseInt(data.domains_being_blocked) || 0,
      unique_domains: parseInt(data.unique_domains) || 0,
      clients_seen: parseInt(data.clients_ever_seen) || 0,
    };
  },

  async action(app, credential, body) {
    const baseUrl = app.url.replace(/\/$/, '');
    const params = {};
    if (credential?.api_token) {
      params.auth = credential.api_token;
    }

    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    if (body.action === 'disable') {
      const seconds = body.duration || 300;
      await client.get('/admin/api.php', {
        params: { disable: seconds, ...params },
      });
      return { disabled_for: seconds };
    }

    if (body.action === 'enable') {
      await client.get('/admin/api.php', {
        params: { enable: '', ...params },
      });
      return { enabled: true };
    }

    throw new Error(`Unknown action: ${body.action}`);
  },

  historyKeys: ['dns_queries', 'blocked_queries', 'blocked_percentage'],
};
