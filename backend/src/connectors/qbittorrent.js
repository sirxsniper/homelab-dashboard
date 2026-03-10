const axios = require('axios');

// Module-level session cache keyed by base URL
const sessionCache = new Map();

function formatSpeed(bytesPerSec) {
  if (bytesPerSec == null) return '0 B/s';
  if (bytesPerSec >= 1024 * 1024 * 1024) {
    return `${(bytesPerSec / (1024 ** 3)).toFixed(1)} GB/s`;
  }
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 ** 2)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${bytesPerSec} B/s`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes >= 1024 ** 4) return `${(bytes / (1024 ** 4)).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function authenticate(baseUrl, credential) {
  const res = await axios.post(
    `${baseUrl}/api/v2/auth/login`,
    new URLSearchParams({
      username: credential.username || 'admin',
      password: credential.password || '',
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: () => true,
    }
  );

  const setCookie = res.headers['set-cookie'];
  if (setCookie) {
    const sidMatch = setCookie.join(';').match(/SID=([^;]+)/);
    if (sidMatch) {
      const cookie = `SID=${sidMatch[1]}`;
      sessionCache.set(baseUrl, cookie);
      return cookie;
    }
  }
  throw new Error('Failed to authenticate with qBittorrent');
}

async function makeRequest(client, path, baseUrl, credential) {
  let cookie = sessionCache.get(baseUrl);

  if (!cookie) {
    cookie = await authenticate(baseUrl, credential);
  }

  try {
    const res = await client.get(path, { headers: { Cookie: cookie } });
    return res;
  } catch (err) {
    if (err.response?.status === 403) {
      cookie = await authenticate(baseUrl, credential);
      return client.get(path, { headers: { Cookie: cookie } });
    }
    throw err;
  }
}

module.exports = {
  type: 'qbittorrent',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const [torrentsRes, transferRes, versionRes] = await Promise.all([
      makeRequest(client, '/api/v2/torrents/info', baseUrl, credential),
      makeRequest(client, '/api/v2/transfer/info', baseUrl, credential),
      makeRequest(client, '/api/v2/app/version', baseUrl, credential),
    ]);

    const torrents = torrentsRes.data || [];
    const transfer = transferRes.data || {};
    const version = typeof versionRes.data === 'string' ? versionRes.data.replace(/^v/, '') : versionRes.data;

    const active = torrents.filter(t => t.state && !['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)).length;
    const seeding = torrents.filter(t => ['uploading', 'stalledUP', 'forcedUP', 'queuedUP'].includes(t.state)).length;
    const paused = torrents.filter(t => ['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)).length;
    const totalSize = torrents.reduce((sum, t) => sum + (t.size || 0), 0);

    const activeTorrents = torrents
      .filter(t => t.dlspeed > 0 || (t.state && !['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)))
      .slice(0, 10)
      .map(t => ({
        name: t.name || 'Unknown',
        progress: Math.round((t.progress || 0) * 100),
        dlspeed: t.dlspeed || 0,
        eta: t.eta || 0,
      }));

    const completedTorrents = torrents
      .filter(t => ['uploading', 'stalledUP', 'pausedUP', 'stoppedUP'].includes(t.state))
      .sort((a, b) => (b.completion_on || 0) - (a.completion_on || 0))
      .slice(0, 3)
      .map(t => ({
        name: t.name || 'Unknown',
        size: formatBytes(t.size || 0),
      }));

    return {
      status: 'online',
      version: version || null,
      active,
      seeding,
      paused,
      total_size: torrents.length > 0 ? formatBytes(totalSize) : '0 B',
      dl_speed: transfer.dl_info_speed || 0,
      ul_speed: transfer.up_info_speed || 0,
      dl_speed_fmt: formatSpeed(transfer.dl_info_speed || 0),
      ul_speed_fmt: formatSpeed(transfer.up_info_speed || 0),
      alltime_dl: formatBytes(transfer.alltime_dl || 0),
      alltime_ul: formatBytes(transfer.alltime_ul || 0),
      dl_today: formatBytes(transfer.dl_info_data || 0),
      ul_today: formatBytes(transfer.up_info_data || 0),
      torrents: activeTorrents,
      completed_list: completedTorrents,
    };
  },

  historyKeys: ['active', 'dl_speed'],
};
