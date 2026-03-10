const axios = require('axios');

module.exports = {
  type: 'vaultwarden',
  defaultInterval: 30,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');
    const start = Date.now();

    try {
      const res = await axios.get(`${baseUrl}/alive`, { timeout: 10000 });
      const responseTime = Date.now() - start;

      return {
        status: res.status === 200 ? 'online' : 'degraded',
        response_time: responseTime,
      };
    } catch (err) {
      return {
        status: 'offline',
        error: err.message,
        response_time: Date.now() - start,
      };
    }
  },

  historyKeys: ['response_time', 'status'],
};
