const axios = require('axios');

module.exports = {
  type: 'nextcloud',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');

    const auth = {};
    if (credential?.username && credential?.password) {
      auth.username = credential.username;
      auth.password = credential.password;
    }

    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      auth: auth.username ? auth : undefined,
      headers: { 'OCS-APIREQUEST': 'true' },
    });

    const res = await client.get('/ocs/v2.php/apps/serverinfo/api/v1/info', {
      params: { format: 'json' },
    });

    const data = res.data?.ocs?.data || {};
    const nc = data.nextcloud || {};
    const system = nc.system || {};
    const storage = nc.storage || {};
    const shares = nc.shares || {};
    const server = data.server || {};
    const activeUsers = data.activeUsers || {};

    // freespace is under system, not storage
    const storageFree = system.freespace || 0;

    // CPU load is an array [1min, 5min, 15min]
    const cpuLoad = Array.isArray(system.cpuload) ? system.cpuload : [];
    const cpuLoadVal = cpuLoad.length > 0 ? parseFloat(cpuLoad[0].toFixed(1)) : 0;

    const memTotal = system.mem_total || 0;
    const memFree = system.mem_free || 0;
    const memPct = memTotal > 0 ? parseFloat(((1 - memFree / memTotal) * 100).toFixed(1)) : 0;

    const dbSize = parseInt(server.database?.size || '0', 10);

    return {
      status: 'online',
      version: system.version || null,
      files: storage.num_files || 0,
      active_users_24h: activeUsers.last24hours || 0,
      active_users_5min: activeUsers.last5minutes || 0,
      storage_free: storageFree > 0
        ? (storageFree >= 1024 ** 4 ? `${(storageFree / (1024 ** 4)).toFixed(1)} TB` : `${(storageFree / (1024 ** 3)).toFixed(1)} GB`)
        : 'Unknown',
      shares: shares.num_shares || 0,
      apps_installed: system.apps?.num_installed || 0,
      db_size: dbSize > 0
        ? (dbSize >= 1024 ** 3 ? `${(dbSize / (1024 ** 3)).toFixed(1)} GB` : `${(dbSize / (1024 ** 2)).toFixed(1)} MB`)
        : 'Unknown',
      cpu_load: cpuLoadVal,
      memory_pct: memPct,
    };
  },

  historyKeys: ['active_users_24h', 'cpu_load'],
};
