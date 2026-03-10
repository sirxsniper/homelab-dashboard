const axios = require('axios');

module.exports = {
  type: 'searxng',
  defaultInterval: 60,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const start = Date.now();

    // Check health
    await client.get('/healthz');

    const responseTime = Date.now() - start;

    // Get config for engine count
    let engines = 0;
    try {
      const configRes = await client.get('/config');
      const config = configRes.data;
      if (Array.isArray(config.engines)) {
        engines = config.engines.length;
      } else if (config.engines != null) {
        engines = config.engines;
      }
    } catch {
      // Config endpoint may not be available
    }

    return {
      status: 'online',
      engines,
      response_time: responseTime,
    };
  },

  historyKeys: [],
};
