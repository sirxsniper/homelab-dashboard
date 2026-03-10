const axios = require('axios');

module.exports = {
  type: 'uptime_kuma',
  defaultInterval: 15,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    // Uptime Kuma uses basic auth (empty user, API key as password) for /metrics
    const authOpts = {};
    if (credential?.api_key) {
      authOpts.auth = { username: '', password: credential.api_key };
    }

    const client = axios.create({ baseURL: baseUrl, headers, ...authOpts, timeout: 10000 });

    // Try the metrics endpoint (Prometheus format)
    try {
      const metricsRes = await client.get('/metrics');
      const text = metricsRes.data;

      const monitors = [];
      const lines = text.split('\n');
      const monitorUp = {};
      const monitorLatency = {};

      for (const line of lines) {
        if (line.startsWith('monitor_status{')) {
          const nameMatch = line.match(/monitor_name="([^"]+)"/);
          const valueMatch = line.match(/\}\s+(\d+)/);
          if (nameMatch && valueMatch) {
            monitorUp[nameMatch[1]] = parseInt(valueMatch[1]);
          }
        }
        if (line.startsWith('monitor_response_time{')) {
          const nameMatch = line.match(/monitor_name="([^"]+)"/);
          const valueMatch = line.match(/\}\s+([\d.]+)/);
          if (nameMatch && valueMatch) {
            monitorLatency[nameMatch[1]] = parseFloat(valueMatch[1]);
          }
        }
      }

      for (const name of Object.keys(monitorUp)) {
        monitors.push({
          name,
          status: monitorUp[name] === 1 ? 'up' : 'down',
          latency: monitorLatency[name] || 0,
        });
      }

      const up = monitors.filter(m => m.status === 'up').length;
      const down = monitors.filter(m => m.status === 'down').length;

      return {
        status: down === 0 ? 'online' : 'degraded',
        total_monitors: monitors.length,
        up,
        down,
        monitors,
      };
    } catch {
      // Fallback: just ping
      const start = Date.now();
      const res = await client.get('/', { validateStatus: () => true });
      return {
        status: res.status >= 200 && res.status < 400 ? 'online' : 'degraded',
        response_time: Date.now() - start,
      };
    }
  },

  historyKeys: ['up', 'down'],
};
