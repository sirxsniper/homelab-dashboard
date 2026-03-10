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

    const [versionRes, servicesRes] = await Promise.allSettled([
      client.get('/api/version'),
      client.get('/api/services/list'),
    ]);

    const responseTime = Date.now() - start;

    // Parse version/info response
    let version = null;
    let uptime = null;
    let integrations = {};
    let integrationsTotal = 0;
    let apps = [];
    let host = null;

    if (versionRes.status === 'fulfilled') {
      const msg = versionRes.value?.data?.message;
      if (msg) {
        // Client info
        version = msg.client?.version || null;
        uptime = msg.client?.uptimeSec || null;

        // Count integrated apps
        const nums = msg.num || {};
        for (const [name, count] of Object.entries(nums)) {
          if (count > 0) {
            integrations[name] = count;
            integrationsTotal += count;
          }
        }

        // App statuses (detailed)
        const statuses = msg.appsStatus || {};
        for (const [type, instances] of Object.entries(statuses)) {
          if (!Array.isArray(instances)) continue;
          for (const inst of instances) {
            apps.push({
              name: inst.name || type,
              type,
              up: inst.up !== false,
              version: inst.systemStatus?.version || null,
            });
          }
        }

        // Host info
        if (msg.host) {
          host = {
            hostname: msg.host.hostname || null,
            os: msg.host.platform || msg.host.os || null,
            kernel: msg.host.kernelVersion || null,
            arch: msg.host.kernelArch || null,
            docker: msg.client?.docker || false,
          };
        }
      }
    }

    // Parse service checks
    let services = [];
    let servicesUp = 0;
    let servicesDown = 0;

    if (servicesRes.status === 'fulfilled') {
      const raw = servicesRes.value?.data?.message;
      const svcList = Array.isArray(raw) ? raw : [];

      for (const svc of svcList) {
        const name = svc.name || 'Unknown';
        const isUp = svc.state === 0;
        const since = svc.since && svc.since !== '0001-01-01T00:00:00Z' ? svc.since : null;
        services.push({
          name,
          state: isUp ? 'ok' : 'down',
          output: svc.output || null,
          since,
        });
        if (isUp) servicesUp++;
        else servicesDown++;
      }
    }

    return {
      status: 'online',
      response_time: responseTime,
      version,
      uptime,
      integrations,
      integrations_total: integrationsTotal,
      apps,
      services,
      services_total: services.length,
      services_up: servicesUp,
      services_down: servicesDown,
      host,
    };
  },

  historyKeys: ['services_up', 'services_down'],
};
