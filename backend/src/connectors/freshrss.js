const axios = require('axios');

const authCache = new Map();
const TOKEN_TTL = 10 * 60 * 1000; // 10 minutes

async function authenticate(baseUrl, credential) {
  const params = new URLSearchParams();
  params.append('Email', credential.username);
  params.append('Passwd', credential.password);

  const res = await axios.post(
    `${baseUrl}/api/greader.php/accounts/ClientLogin`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
  );

  const lines = res.data.split('\n');
  const authLine = lines.find(l => l.startsWith('Auth='));
  if (!authLine) throw new Error('FreshRSS auth failed: no Auth token in response');
  return authLine.replace('Auth=', '').trim();
}

async function getToken(app, credential) {
  const cached = authCache.get(app.id);
  if (cached && Date.now() < cached.expiry) return cached.token;

  const baseUrl = app.url.replace(/\/$/, '');
  const token = await authenticate(baseUrl, credential);
  authCache.set(app.id, { token, expiry: Date.now() + TOKEN_TTL });
  return token;
}

function clearCache(appId) {
  authCache.delete(appId);
}

function makeClient(baseUrl, token) {
  return axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: { Authorization: `GoogleLogin auth=${token}` },
  });
}

async function getWriteToken(client) {
  const res = await client.get('/api/greader.php/reader/api/0/token');
  return res.data.trim();
}

function parseArticles(items) {
  return (items || []).map(item => ({
    id: item.id || '',
    title: item.title || 'Untitled',
    feed: item.origin?.title || '',
    feed_id: item.origin?.streamId || '',
    published: item.published || (item.crawlTimeMsec ? Math.floor(Number(item.crawlTimeMsec) / 1000) : null),
    summary: item.summary?.content
      ? item.summary.content.replace(/<[^>]*>/g, '').slice(0, 200)
      : '',
    content: item.summary?.content || '',
    url: item.canonical?.[0]?.href || item.alternate?.[0]?.href || '',
    unread: !(item.categories || []).includes('user/-/state/com.google/read'),
    starred: (item.categories || []).includes('user/-/state/com.google/starred'),
  }));
}

function joinFeedsWithUnread(subscriptions, unreadcounts) {
  const unreadMap = new Map();
  for (const u of unreadcounts) {
    unreadMap.set(u.id, Number(u.count) || 0);
  }
  return subscriptions.map(sub => ({
    id: sub.id || '',
    title: sub.title || 'Unknown',
    category: sub.categories?.[0]?.label || 'Uncategorized',
    unread: unreadMap.get(sub.id) || 0,
  }));
}

async function withRetry(app, credential, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.response?.status === 401) {
      clearCache(app.id);
      const baseUrl = app.url.replace(/\/$/, '');
      const token = await authenticate(baseUrl, credential);
      authCache.set(app.id, { token, expiry: Date.now() + TOKEN_TTL });
      return await fn(token);
    }
    throw err;
  }
}

module.exports = {
  type: 'freshrss',
  defaultInterval: 120,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const start = Date.now();

    const token = await getToken(app, credential);
    const client = makeClient(baseUrl, token);

    const doFetch = async (overrideToken) => {
      const c = overrideToken ? makeClient(baseUrl, overrideToken) : client;

      const [unreadRes, subsRes, tagsRes, starredRes, recentRes] = await Promise.all([
        c.get('/api/greader.php/reader/api/0/unread-count?output=json'),
        c.get('/api/greader.php/reader/api/0/subscription/list?output=json'),
        c.get('/api/greader.php/reader/api/0/tag/list?output=json'),
        c.get('/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/starred?n=1&output=json'),
        c.get('/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list?n=5&r=d&output=json'),
      ]);

      const unreadcounts = unreadRes.data?.unreadcounts || [];
      const readingListEntry = unreadcounts.find(e => e.id?.includes('state/com.google/reading-list'));
      const totalUnread = readingListEntry ? Number(readingListEntry.count) || 0
        : unreadcounts.filter(e => e.id?.startsWith('feed/')).reduce((sum, e) => sum + (Number(e.count) || 0), 0);

      const subscriptions = subsRes.data?.subscriptions || [];

      const tags = tagsRes.data?.tags || [];
      const categories = tags
        .filter(t => t.type === 'folder' || /\/label\//.test(t.id))
        .map(t => ({ label: t.id?.split('/').pop() || t.id, id: t.id }));

      const starredTotal = starredRes.data?.items?.length || 0;

      const recentItems = recentRes.data?.items || [];

      return {
        status: 'online',
        unread_count: totalUnread,
        total_feeds: subscriptions.length,
        categories_count: categories.length,
        starred_count: starredTotal,
        categories,
        feeds: joinFeedsWithUnread(subscriptions, unreadcounts),
        recent_articles: parseArticles(recentItems),
        response_time: Date.now() - start,
      };
    };

    return await withRetry(app, credential, doFetch);
  },

  async action(app, credential, body) {
    const baseUrl = app.url.replace(/\/$/, '');
    const token = await getToken(app, credential);
    const client = makeClient(baseUrl, token);

    const doAction = async (overrideToken) => {
      const c = overrideToken ? makeClient(baseUrl, overrideToken) : client;

      switch (body.action) {
        case 'get_articles': {
          const streamId = body.streamId || 'user/-/state/com.google/reading-list';
          const count = body.count || 20;
          let url = `/api/greader.php/reader/api/0/stream/contents/${encodeURIComponent(streamId)}?n=${count}&output=json`;
          if (body.continuation) url += `&c=${encodeURIComponent(body.continuation)}`;
          if (body.exclude) url += `&xt=${encodeURIComponent(body.exclude)}`;
          const res = await c.get(url);
          return {
            articles: parseArticles(res.data?.items || []),
            continuation: res.data?.continuation || null,
          };
        }

        case 'mark_read': {
          const writeToken = await getWriteToken(c);
          const params = new URLSearchParams();
          params.append('a', 'user/-/state/com.google/read');
          params.append('i', body.itemId);
          params.append('T', writeToken);
          await c.post('/api/greader.php/reader/api/0/edit-tag', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return { success: true };
        }

        case 'mark_unread': {
          const writeToken = await getWriteToken(c);
          const params = new URLSearchParams();
          params.append('r', 'user/-/state/com.google/read');
          params.append('i', body.itemId);
          params.append('T', writeToken);
          await c.post('/api/greader.php/reader/api/0/edit-tag', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return { success: true };
        }

        case 'toggle_star': {
          const writeToken = await getWriteToken(c);
          const params = new URLSearchParams();
          if (body.starred) {
            params.append('a', 'user/-/state/com.google/starred');
          } else {
            params.append('r', 'user/-/state/com.google/starred');
          }
          params.append('i', body.itemId);
          params.append('T', writeToken);
          await c.post('/api/greader.php/reader/api/0/edit-tag', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return { success: true };
        }

        case 'mark_all_read': {
          const writeToken = await getWriteToken(c);
          const ts = body.timestamp || Date.now() * 1000;
          const params = new URLSearchParams();
          params.append('s', body.streamId);
          params.append('T', writeToken);
          params.append('ts', String(ts));
          await c.post('/api/greader.php/reader/api/0/mark-all-as-read', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return { success: true };
        }

        case 'get_feeds': {
          const [subsRes, unreadRes] = await Promise.all([
            c.get('/api/greader.php/reader/api/0/subscription/list?output=json'),
            c.get('/api/greader.php/reader/api/0/unread-count?output=json'),
          ]);
          return {
            feeds: joinFeedsWithUnread(
              subsRes.data?.subscriptions || [],
              unreadRes.data?.unreadcounts || []
            ),
          };
        }

        default:
          throw new Error(`Unknown FreshRSS action: ${body.action}`);
      }
    };

    return await withRetry(app, credential, doAction);
  },

  historyKeys: ['unread_count', 'total_feeds'],
};
