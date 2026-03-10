const axios = require('axios');

function formatSpeed(bytesPerSec) {
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

module.exports = {
  type: 'sabnzbd',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const apiKey = credential?.api_key || '';

    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const [queueRes, historyRes] = await Promise.all([
      client.get('/api', { params: { mode: 'queue', apikey: apiKey, output: 'json' } }),
      client.get('/api', { params: { mode: 'history', limit: 5, apikey: apiKey, output: 'json' } }),
    ]);

    const q = queueRes.data.queue || {};
    const h = historyRes.data.history || {};

    const speedKB = parseFloat(q.kbpersec) || 0;
    const speedBytes = Math.round(speedKB * 1024);

    const slots = q.slots || [];
    const queueItems = slots.map(s => ({
      name: s.filename || 'Unknown',
      progress: parseFloat(s.percentage) || 0,
      sizeleft: s.sizeleft || '0 MB',
      timeleft: s.timeleft || 'Unknown',
    }));

    const pausedCount = slots.filter(s => s.status === 'Paused').length;
    const diskFree = (q.diskspace1_norm || 'Unknown').replace(/\s*([TGMK])$/, ' $1B');

    const historySlots = h.slots || [];
    const completedToday = h.noofslots || 0;

    const history = historySlots.map(s => ({
      name: s.name || 'Unknown',
      size: s.size || 'Unknown',
      status: s.status || 'Unknown',
    }));

    return {
      status: q.paused ? 'paused' : 'online',
      version: q.version || null,
      speed: q.speed || formatSpeed(speedBytes),
      queue_count: slots.length,
      downloading: q.noofslots || 0,
      paused_count: pausedCount,
      disk_free: diskFree,
      completed_today: completedToday,
      queue: queueItems,
      history,
      speed_bytes: speedBytes,
    };
  },

  historyKeys: ['queue_count', 'speed_bytes'],
};
