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
      token = credential.api_key.trim().replace(/[\r\n]/g, '');
    }

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const get = (url) => client.get(url, { headers: authHeaders }).catch(() => ({ data: null }));

    // Fetch all data in parallel
    const [modelsRes, usersRes, chatsRes, knowledgeRes, promptsRes, toolsRes] = await Promise.all([
      get('/api/v1/models'),
      get('/api/v1/users/'),
      get('/api/v1/chats/'),
      get('/api/v1/knowledge/'),
      get('/api/v1/prompts/'),
      get('/api/v1/tools/'),
    ]);

    // Models
    const modelsData = modelsRes.data;
    const modelsArr = Array.isArray(modelsData) ? modelsData : (Array.isArray(modelsData?.data) ? modelsData.data : []);
    const modelsList = modelsArr.slice(0, 30).map(m => ({
      id: m.id || m.name || 'Unknown',
      name: m.name || m.id || 'Unknown',
      owned_by: m.owned_by || null,
    }));

    // Users
    const usersData = usersRes.data;
    const usersArr = Array.isArray(usersData?.users) ? usersData.users : (Array.isArray(usersData) ? usersData : []);
    const usersTotal = usersData?.total || usersArr.length;
    const adminCount = usersArr.filter(u => u.role === 'admin').length;
    const activeRecently = usersArr.filter(u => {
      if (!u.last_active_at) return false;
      const last = typeof u.last_active_at === 'number' ? u.last_active_at * 1000 : new Date(u.last_active_at).getTime();
      return Date.now() - last < 24 * 60 * 60 * 1000;
    }).length;

    // Chats
    const chatsArr = Array.isArray(chatsRes.data) ? chatsRes.data : [];
    const recentChats = chatsArr.slice(0, 10).map(c => ({
      title: c.title || 'Untitled',
      updated_at: c.updated_at || c.created_at || null,
    }));

    // Knowledge bases
    const knowledgeData = knowledgeRes.data;
    const knowledgeArr = Array.isArray(knowledgeData?.items) ? knowledgeData.items : (Array.isArray(knowledgeData) ? knowledgeData : []);
    const knowledgeTotal = knowledgeData?.total || knowledgeArr.length;

    // Prompts
    const promptsArr = Array.isArray(promptsRes.data) ? promptsRes.data : [];

    // Tools
    const toolsArr = Array.isArray(toolsRes.data) ? toolsRes.data : [];

    return {
      status: 'online',
      models_count: modelsArr.length,
      models: modelsList,
      users_total: usersTotal,
      users_admin: adminCount,
      users_active_24h: activeRecently,
      chats_count: chatsArr.length,
      recent_chats: recentChats,
      knowledge_count: knowledgeTotal,
      prompts_count: promptsArr.length,
      tools_count: toolsArr.length,
      response_time: responseTime,
    };
  },

  historyKeys: ['models_count', 'chats_count'],
};
