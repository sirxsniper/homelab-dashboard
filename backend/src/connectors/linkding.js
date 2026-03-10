const axios = require('axios');

module.exports = {
  type: 'linkding',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['Authorization'] = `Token ${credential.api_key}`;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const [recentRes, countRes] = await Promise.all([
      client.get('/api/bookmarks/', { params: { limit: 5 } }),
      client.get('/api/bookmarks/', { params: { q: '', limit: 0 } }),
    ]);

    const recentData = recentRes.data;
    const countData = countRes.data;

    const totalBookmarks = countData.count || recentData.count || 0;

    const results = recentData.results || [];
    const recent = results.slice(0, 5).map(b => ({
      title: b.title || b.website_title || b.url || 'Untitled',
      url: b.url || '',
      date_added: b.date_added || null,
    }));

    const unread = results.filter(b => b.unread).length;

    // Try to get tags count
    let tagsCount = 0;
    try {
      const tagsRes = await client.get('/api/tags/', { params: { limit: 0 } });
      tagsCount = tagsRes.data?.count || 0;
    } catch {
      // Tags endpoint may not be available
    }

    return {
      status: 'online',
      bookmarks: totalBookmarks,
      tags: tagsCount,
      unread,
      recent,
    };
  },

  historyKeys: ['bookmarks'],
};
