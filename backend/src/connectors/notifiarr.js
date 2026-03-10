const axios = require('axios');

module.exports = {
  type: 'notifiarr',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['x-api-key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const start = Date.now();

    // Try to get version info, fallback to simple ping
    let version = null;
    try {
      const versionRes = await client.get('/api/v1/info/version');
      version = versionRes.data?.version || versionRes.data || null;
    } catch {
      // Just ping the base URL
      await client.get('/', { validateStatus: () => true });
    }

    const responseTime = Date.now() - start;

    return {
      status: 'online',
      response_time: responseTime,
      version,
    };
  },

  historyKeys: [],
};
