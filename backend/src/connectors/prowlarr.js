const axios = require('axios');

module.exports = {
  type: 'prowlarr',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Api-Key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const [indexerRes, statsRes, statusRes] = await Promise.all([
      client.get('/api/v1/indexer'),
      client.get('/api/v1/indexerstats'),
      client.get('/api/v1/system/status'),
    ]);

    const indexers = indexerRes.data;
    const stats = statsRes.data;
    const status = statusRes.data;

    const enabled = indexers.filter(i => i.enable !== false).length;
    const failed = indexers.filter(i => i.status?.lastFailure).length;

    const indexerStats = stats.indexers || stats || [];
    const queriesToday = indexerStats.reduce((sum, s) => sum + (s.numberOfQueries || 0), 0);
    const grabsToday = indexerStats.reduce((sum, s) => sum + (s.numberOfGrabs || 0), 0);

    const avgResponses = indexerStats
      .filter(s => s.averageResponseTime != null)
      .map(s => s.averageResponseTime);
    const avgResponse = avgResponses.length > 0
      ? Math.round(avgResponses.reduce((a, b) => a + b, 0) / avgResponses.length)
      : 0;

    const indexerList = indexers.map(i => {
      const st = indexerStats.find(s => s.indexerId === i.id || s.indexerName === i.name);
      return {
        name: i.name,
        enabled: i.enable !== false,
        avg_response: st?.averageResponseTime || 0,
      };
    });

    return {
      status: 'online',
      version: status.version || null,
      indexers: indexers.length,
      enabled,
      failed,
      queries_today: queriesToday,
      grabs_today: grabsToday,
      avg_response: avgResponse,
      indexer_list: indexerList,
    };
  },

  historyKeys: ['queries_today', 'grabs_today'],
};
