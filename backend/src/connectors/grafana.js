const axios = require('axios');

module.exports = {
  type: 'grafana',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['Authorization'] = `Bearer ${credential.api_key}`;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const [dashRes, dsRes, alertsRes, healthRes] = await Promise.all([
      client.get('/api/search?type=dash-db'),
      client.get('/api/datasources'),
      client.get('/api/alertmanager/grafana/api/v2/alerts').catch(() => ({ data: [] })),
      client.get('/api/health'),
    ]);

    const dashboards = dashRes.data;
    const datasources = dsRes.data;
    const alerts = alertsRes.data;
    const health = healthRes.data;

    const firingAlerts = Array.isArray(alerts)
      ? alerts.filter(a => a.status?.state === 'active').length
      : 0;

    return {
      status: 'online',
      version: health.version,
      dashboards: dashboards.length,
      datasources: datasources.length,
      firing_alerts: firingAlerts,
    };
  },

  historyKeys: ['firing_alerts'],
};
