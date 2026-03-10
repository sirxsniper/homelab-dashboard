const axios = require('axios');

module.exports = {
  type: 'immich',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['x-api-key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    // Try v1.118+ endpoint first, fallback to older
    let statsData;
    try {
      const res = await client.get('/api/server/statistics');
      statsData = res.data;
    } catch (err) {
      const res = await client.get('/api/server-info/statistics');
      statsData = res.data;
    }

    let versionData;
    try {
      const res = await client.get('/api/server/version');
      versionData = res.data;
    } catch {
      versionData = {};
    }

    const version = versionData.major != null
      ? `${versionData.major}.${versionData.minor}.${versionData.patch}`
      : null;

    // Stats can be per-user array or aggregated
    let photos = 0;
    let videos = 0;
    let storageUsed = 0;
    let users = 0;

    if (Array.isArray(statsData.usageByUser || statsData)) {
      const userStats = statsData.usageByUser || statsData;
      users = userStats.length;
      for (const u of userStats) {
        photos += u.photos || 0;
        videos += u.videos || 0;
        storageUsed += u.usage || 0;
      }
    } else {
      photos = statsData.photos || 0;
      videos = statsData.videos || 0;
      storageUsed = statsData.usage || 0;
      users = statsData.usageByUser?.length || 0;
    }

    // Format storage (use SI units for cleaner display)
    let storageHuman;
    if (storageUsed >= 1e12) {
      storageHuman = `${(storageUsed / 1e12).toFixed(2)} TB`;
    } else {
      storageHuman = `${(storageUsed / 1e9).toFixed(1)} GB`;
    }

    return {
      status: 'online',
      version,
      photos,
      videos,
      storage_used: storageHuman,
      users,
      albums: statsData.albums || 0,
      total_assets: photos + videos,
    };
  },

  historyKeys: ['photos', 'videos'],
};
