const axios = require('axios');

module.exports = {
  type: 'phpmyadmin',
  defaultInterval: 60,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');

    const start = Date.now();

    await axios.get(baseUrl, {
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    const responseTime = Date.now() - start;

    return {
      status: 'online',
      response_time: responseTime,
    };
  },

  historyKeys: [],
};
