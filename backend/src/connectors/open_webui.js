const axios = require('axios');

module.exports = {
  type: 'open_webui',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['Authorization'] = `Bearer ${credential.api_key}`;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const start = Date.now();

    // Check health
    await client.get('/health');

    const responseTime = Date.now() - start;

    // Try to get models list
    let modelsCount = 0;
    try {
      const modelsRes = await client.get('/api/v1/models');
      const data = modelsRes.data;
      if (Array.isArray(data)) {
        modelsCount = data.length;
      } else if (Array.isArray(data?.data)) {
        modelsCount = data.data.length;
      }
    } catch {
      // Models endpoint may require auth or not be available
    }

    return {
      status: 'online',
      models_count: modelsCount,
      response_time: responseTime,
    };
  },

  historyKeys: [],
};
