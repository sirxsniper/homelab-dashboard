const axios = require('axios');

const fmtBytes = (bytes) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 ** 4) return `${(bytes / (1024 ** 4)).toFixed(1)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

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

    const start = Date.now();

    const [infoRes, usersRes] = await Promise.allSettled([
      client.get('/ocs/v2.php/apps/serverinfo/api/v1/info', { params: { format: 'json' } }),
      client.get('/ocs/v1.php/cloud/users', { params: { format: 'json' } }),
    ]);

    const responseTime = Date.now() - start;

    const data = infoRes.status === 'fulfilled' ? (infoRes.value?.data?.ocs?.data || {}) : {};
    const nc = data.nextcloud || {};
    const system = nc.system || {};
    const storage = nc.storage || {};
    const shares = nc.shares || {};
    const server = data.server || {};
    const activeUsers = data.activeUsers || {};

    // Users
    let totalUsers = 0;
    if (usersRes.status === 'fulfilled') {
      const usersData = usersRes.value?.data?.ocs?.data?.users;
      totalUsers = Array.isArray(usersData) ? usersData.length : 0;
    }

    // Storage
    const storageFree = system.freespace || 0;

    // CPU load [1min, 5min, 15min]
    const cpuLoad = Array.isArray(system.cpuload) ? system.cpuload : [];
    const cpuLoadVal = cpuLoad.length > 0 ? parseFloat(cpuLoad[0].toFixed(1)) : 0;

    // Memory
    const memTotal = system.mem_total ? system.mem_total * 1024 : 0; // KB to bytes
    const memFree = system.mem_free ? system.mem_free * 1024 : 0;
    const memUsed = memTotal - memFree;
    const memPct = memTotal > 0 ? parseFloat(((memUsed / memTotal) * 100).toFixed(1)) : 0;

    // Swap
    const swapTotal = system.swap_total ? system.swap_total * 1024 : 0;
    const swapFree = system.swap_free ? system.swap_free * 1024 : 0;
    const swapUsed = swapTotal - swapFree;
    const swapPct = swapTotal > 0 ? parseFloat(((swapUsed / swapTotal) * 100).toFixed(1)) : 0;

    // Database
    const dbSize = parseInt(server.database?.size || '0', 10);

    // PHP
    const phpVersion = server.php?.version || null;
    const phpMemLimit = server.php?.memory_limit ? parseInt(server.php.memory_limit, 10) : null;
    const phpUploadMax = server.php?.upload_max_filesize ? parseInt(server.php.upload_max_filesize, 10) : null;

    // Webserver
    const webserver = server.webserver || null;
    const dbType = server.database?.type || null;
    const dbVersion = server.database?.version || null;

    // Storage counts
    const numUsers = storage.num_users || totalUsers || 0;
    const numStorages = storage.num_storages || 0;
    const numStoragesLocal = storage.num_storages_local || 0;
    const numStoragesOther = storage.num_storages_other || 0;

    return {
      status: 'online',
      response_time: responseTime,
      version: system.version || null,
      files: storage.num_files || 0,
      users_total: numUsers,
      active_users_24h: activeUsers.last24hours || 0,
      active_users_5min: activeUsers.last5minutes || 0,
      storage_free: fmtBytes(storageFree),
      storage_free_bytes: storageFree,
      shares: shares.num_shares || 0,
      shares_fed_sent: shares.num_fed_shares_sent || 0,
      shares_fed_received: shares.num_fed_shares_received || 0,
      apps_installed: system.apps?.num_installed || 0,
      apps_updates: system.apps?.num_updates_available || 0,
      db_type: dbType,
      db_version: dbVersion,
      db_size: fmtBytes(dbSize),
      cpu_load: cpuLoadVal,
      cpu_load_5: cpuLoad.length > 1 ? parseFloat(cpuLoad[1].toFixed(1)) : null,
      cpu_load_15: cpuLoad.length > 2 ? parseFloat(cpuLoad[2].toFixed(1)) : null,
      memory_pct: memPct,
      memory_used: fmtBytes(memUsed),
      memory_total: fmtBytes(memTotal),
      swap_pct: swapPct,
      swap_used: fmtBytes(swapUsed),
      swap_total: fmtBytes(swapTotal),
      php_version: phpVersion,
      php_memory_limit: phpMemLimit ? fmtBytes(phpMemLimit) : null,
      php_upload_max: phpUploadMax ? fmtBytes(phpUploadMax) : null,
      webserver: webserver,
      storages: numStorages,
      storages_local: numStoragesLocal,
      storages_other: numStoragesOther,
    };
  },

  historyKeys: ['active_users_24h', 'cpu_load', 'memory_pct'],
};
