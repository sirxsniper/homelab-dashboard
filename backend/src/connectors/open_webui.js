const axios = require('axios');

module.exports = {
  type: 'open_webui',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const start = Date.now();

    // Health check — no auth needed
    await client.get('/health');

    const responseTime = Date.now() - start;

    // Authenticate — sign in with username/password to get a JWT
    let token = null;
    if (credential?.username && credential?.password) {
      try {
        const authRes = await client.post('/api/v1/auths/signin', {
          email: credential.username,
          password: credential.password,
        });
        token = authRes.data?.token || null;
      } catch {
        // Sign-in failed — continue without auth
      }
    } else if (credential?.api_key) {
      // Backwards compatibility: support existing API key credentials
      token = credential.api_key.trim().replace(/[\r\n]/g, '');
    }

    // Try to get models list
    let modelsCount = 0;
    let modelsList = [];
    if (token) {
      try {
        const modelsRes = await client.get('/api/v1/models', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = modelsRes.data;
        const models = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        modelsCount = models.length;
        modelsList = models.slice(0, 20).map(m => ({
          id: m.id || m.name || 'Unknown',
          name: m.name || m.id || 'Unknown',
          owned_by: m.owned_by || null,
        }));
      } catch {
        // Models endpoint may not be available
      }
    }

    return {
      status: 'online',
      models_count: modelsCount,
      models: modelsList,
      response_time: responseTime,
    };
  },

  historyKeys: [],
};
