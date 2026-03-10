const axios = require('axios');

module.exports = {
  type: 'metube',
  defaultInterval: 15,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    // Newer MeTube uses /history, older uses /api/v1/q + /api/v1/done
    let queueItems = [];
    let doneItems = [];
    let pendingItems = [];

    try {
      const res = await client.get('/history');
      const data = res.data || {};
      doneItems = Array.isArray(data.done) ? data.done : (typeof data.done === 'object' ? Object.values(data.done) : []);
      queueItems = Array.isArray(data.queue) ? data.queue : (typeof data.queue === 'object' ? Object.values(data.queue) : []);
      pendingItems = Array.isArray(data.pending) ? data.pending : (typeof data.pending === 'object' ? Object.values(data.pending) : []);
    } catch {
      // Fallback to old API
      const [queueRes, doneRes] = await Promise.all([
        client.get('/api/v1/q').catch(() => ({ data: {} })),
        client.get('/api/v1/done').catch(() => ({ data: {} })),
      ]);
      const qData = queueRes.data || {};
      const dData = doneRes.data || {};
      queueItems = Array.isArray(qData.queue) ? qData.queue : (typeof qData.queue === 'object' ? Object.values(qData.queue) : []);
      doneItems = Array.isArray(dData.done) ? dData.done : (typeof dData.done === 'object' ? Object.values(dData.done) : []);
    }

    const completed = doneItems.filter(d => d.status === 'finished' || (!d.error && d.status !== 'error')).length;
    const failed = doneItems.filter(d => d.status === 'error' || d.error).length;

    const queue = [...queueItems, ...pendingItems].map(q => ({
      title: q.title || q.url || 'Unknown',
      progress: q.percent != null ? Math.round(q.percent) : (q.progress || 0),
    }));

    const fmtSize = (bytes) => {
      if (!bytes) return null;
      if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
      if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
      return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const completedList = doneItems
      .filter(d => d.status === 'finished' || (!d.error && d.status !== 'error'))
      .reverse()
      .slice(0, 20)
      .map(d => ({
        title: d.title || d.url || 'Unknown',
        format: d.format || d.quality || null,
        size: fmtSize(d.size),
      }));

    return {
      status: 'online',
      queue_count: queueItems.length + pendingItems.length,
      completed,
      failed,
      queue,
      completed_list: completedList,
    };
  },

  historyKeys: ['queue_count'],
};
