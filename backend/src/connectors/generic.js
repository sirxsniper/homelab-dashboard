const axios = require('axios');

module.exports = {
  type: 'generic',
  defaultInterval: 30,

  async fetch(app) {
    const start = Date.now();
    try {
      const res = await axios.get(app.url, { timeout: 10000, validateStatus: () => true });
      const responseTime = Date.now() - start;
      return {
        status: res.status >= 200 && res.status < 400 ? 'online' : 'degraded',
        http_status: res.status,
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
