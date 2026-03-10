const axios = require('axios');

function relDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d - now) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `in ${diff}d`;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

module.exports = {
  type: 'sonarr',
  defaultInterval: 15,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Api-Key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const [seriesRes, wantedRes, queueRes, statusRes, calendarRes] = await Promise.all([
      client.get('/api/v3/series'),
      client.get('/api/v3/wanted/missing', { params: { pageSize: 5 } }),
      client.get('/api/v3/queue'),
      client.get('/api/v3/system/status'),
      client.get('/api/v3/calendar', { params: { start: today, end: future, includeSeries: true } }),
    ]);

    const series = seriesRes.data;
    const wanted = wantedRes.data;
    const queue = queueRes.data;
    const status = statusRes.data;
    const calendar = calendarRes.data;

    const totalEpisodes = series.reduce((sum, s) => sum + (s.statistics?.episodeCount || 0), 0);
    const monitored = series.filter(s => s.monitored).length;
    const unmonitored = series.length - monitored;
    const missingCount = wanted.totalRecords || 0;

    const queueRecords = queue.records || queue || [];
    const queueItems = (Array.isArray(queueRecords) ? queueRecords : []).map(q => ({
      title: q.title || q.series?.title || 'Unknown',
      progress: q.sizeleft && q.size ? Math.round((1 - q.sizeleft / q.size) * 100) : 0,
      sizeleft: q.sizeleft || 0,
      timeleft: q.timeleft || 'Unknown',
    }));

    const upcoming = (Array.isArray(calendar) ? calendar : []).slice(0, 3).map(item => ({
      series: item.series?.title || item.seriesTitle || 'Unknown',
      episode: 'S' + String(item.seasonNumber || 0).padStart(2,'0') + 'E' + String(item.episodeNumber || 0).padStart(2,'0'),
      title: item.title || '',
      airDate: relDate(item.airDateUtc || item.airDate),
    }));

    return {
      status: 'online',
      version: status.version || null,
      series: series.length,
      episodes: totalEpisodes,
      missing: missingCount,
      monitored,
      unmonitored,
      queue_count: queueItems.length,
      queue: queueItems,
      upcoming,
    };
  },

  historyKeys: ['queue_count', 'missing'],
};
