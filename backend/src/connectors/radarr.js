const axios = require('axios');

module.exports = {
  type: 'radarr',
  defaultInterval: 15,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Api-Key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

    const [moviesRes, wantedRes, queueRes, statusRes, diskRes, calendarRes] = await Promise.all([
      client.get('/api/v3/movie'),
      client.get('/api/v3/wanted/missing', { params: { pageSize: 5 } }),
      client.get('/api/v3/queue'),
      client.get('/api/v3/system/status'),
      client.get('/api/v3/diskspace'),
      client.get('/api/v3/calendar', { params: { start: today, end: future } }),
    ]);

    const movies = moviesRes.data;
    const wanted = wantedRes.data;
    const queue = queueRes.data;
    const status = statusRes.data;
    const diskSpace = diskRes.data;
    const calendar = calendarRes.data;

    const monitored = movies.filter(m => m.monitored).length;
    const unmonitored = movies.length - monitored;
    const missingCount = wanted.totalRecords || 0;
    const sizeOnDisk = movies.reduce((sum, m) => sum + (m.sizeOnDisk || 0), 0);

    const queueRecords = queue.records || queue || [];
    const queueItems = (Array.isArray(queueRecords) ? queueRecords : []).map(q => ({
      title: q.title || q.movie?.title || 'Unknown',
      progress: q.sizeleft && q.size ? Math.round((1 - q.sizeleft / q.size) * 100) : 0,
      sizeleft: q.sizeleft || 0,
      timeleft: q.timeleft || 'Unknown',
    }));

    const firstDisk = Array.isArray(diskSpace) && diskSpace.length > 0 ? diskSpace[0] : {};
    const disk_free = parseFloat(((firstDisk.freeSpace || 0) / (1024 ** 3)).toFixed(2));
    const disk_total = parseFloat(((firstDisk.totalSpace || 0) / (1024 ** 3)).toFixed(2));

    const todayFilter = new Date();
    todayFilter.setHours(0, 0, 0, 0);
    const upcoming = (Array.isArray(calendar) ? calendar : [])
      .map(m => {
        const rawDate = m.inCinemas || m.digitalRelease || m.physicalRelease || null;
        if (!rawDate || new Date(rawDate) < todayFilter) return null;
        let releaseDate = rawDate;
        const d = new Date(rawDate);
        releaseDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return {
          title: m.title || 'Unknown',
          releaseDate,
          releaseType: m.inCinemas ? 'cinema' : m.digitalRelease ? 'digital' : m.physicalRelease ? 'physical' : 'unknown',
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    return {
      status: 'online',
      version: status.version || null,
      movies: movies.length,
      missing: missingCount,
      monitored,
      unmonitored,
      queue_count: queueItems.length,
      queue: queueItems,
      size_on_disk: parseFloat((sizeOnDisk / (1024 ** 3)).toFixed(2)),
      disk_free,
      disk_total,
      upcoming,
    };
  },

  historyKeys: ['queue_count', 'missing'],
};
