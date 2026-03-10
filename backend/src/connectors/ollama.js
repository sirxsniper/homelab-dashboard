const axios = require('axios');

module.exports = {
  type: 'ollama',
  defaultInterval: 30,

  async fetch(app) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const [tagsRes, psRes, versionRes] = await Promise.all([
      client.get('/api/tags'),
      client.get('/api/ps').catch(() => ({ data: {} })),
      client.get('/api/version').catch(() => ({ data: {} })),
    ]);

    const models = tagsRes.data?.models || [];
    const running = psRes.data?.models || [];
    const version = versionRes.data?.version || null;

    const totalSizeBytes = models.reduce((sum, m) => sum + (m.size || 0), 0);

    const modelList = models.map(m => ({
      name: m.name || 'Unknown',
      size: m.size ? `${(m.size / (1024 ** 3)).toFixed(1)} GB` : 'Unknown',
      quantization: m.details?.quantization_level || m.quantization_level || null,
    }));

    const runningList = running.map(r => ({
      name: r.name || 'Unknown',
      vram: r.size_vram ? `${(r.size_vram / (1024 ** 3)).toFixed(1)} GB` : 'Unknown',
    }));

    return {
      status: 'online',
      version,
      models_count: models.length,
      running_count: running.length,
      models: modelList,
      running: runningList,
      total_size_gb: parseFloat((totalSizeBytes / (1024 ** 3)).toFixed(2)),
    };
  },

  historyKeys: ['models_count', 'running_count'],
};
