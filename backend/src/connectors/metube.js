const axios = require('axios');

module.exports = {
  type: 'metube',
  defaultInterval: 15,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const [queueRes, doneRes] = await Promise.all([
      client.get('/api/v1/q').catch(() => ({ data: {} })),
      client.get('/api/v1/done').catch(() => ({ data: {} })),
    ]);

    const queueData = queueRes.data || {};
    const doneData = doneRes.data || {};

    // MeTube queue can be an object keyed by id or an array
    let queueItems = [];
    if (queueData.queue) {
      if (Array.isArray(queueData.queue)) {
        queueItems = queueData.queue;
      } else if (typeof queueData.queue === 'object') {
        queueItems = Object.values(queueData.queue);
      }
    }

    let doneItems = [];
    if (doneData.done) {
      if (Array.isArray(doneData.done)) {
        doneItems = doneData.done;
      } else if (typeof doneData.done === 'object') {
        doneItems = Object.values(doneData.done);
      }
    }

    const completed = doneItems.filter(d => d.status === 'finished' || !d.error).length;
    const failed = doneItems.filter(d => d.status === 'error' || d.error).length;

    const queue = queueItems.map(q => ({
      title: q.title || q.url || 'Unknown',
      progress: q.percent != null ? Math.round(q.percent) : (q.progress || 0),
    }));

    return {
      status: 'online',
      queue_count: queueItems.length,
      completed,
      failed,
      queue,
    };
  },

  historyKeys: ['queue_count'],
};
