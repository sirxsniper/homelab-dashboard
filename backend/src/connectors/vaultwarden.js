const axios = require('axios');

const sessionCache = new Map();
const SESSION_TTL = 10 * 60 * 1000;
const rateLimitUntil = new Map();

async function getAdminSession(baseUrl, token, appId) {
  const cached = sessionCache.get(appId);
  if (cached && Date.now() < cached.expiry) return cached.cookie;

  const blockedUntil = rateLimitUntil.get(appId);
  if (blockedUntil && Date.now() < blockedUntil) {
    throw Object.assign(new Error('Rate limit cooldown'), { response: { status: 429 } });
  }

  const loginRes = await axios.post(`${baseUrl}/admin`, `token=${encodeURIComponent(token)}`, {
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: s => s < 400 || s === 302,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const setCookie = loginRes.headers['set-cookie'];
  const cookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
  sessionCache.set(appId, { cookie, expiry: Date.now() + SESSION_TTL });
  return cookie;
}

module.exports = {
  type: 'vaultwarden',
  defaultInterval: 60,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const start = Date.now();
    const token = credential?.admin_token;

    try {
      await axios.get(`${baseUrl}/alive`, { timeout: 10000 });
    } catch (err) {
      return { status: 'offline', error: err.message, response_time: Date.now() - start };
    }

    const responseTime = Date.now() - start;

    if (!token) {
      return { status: 'online', response_time: responseTime };
    }

    try {
      let cookie = await getAdminSession(baseUrl, token, app.id);

      const makeHeaders = (c) => ({ Cookie: c, Accept: 'application/json' });
      const makeReq = (c) => axios.get(`${baseUrl}/admin/users`, {
        timeout: 10000,
        headers: makeHeaders(c),
      });

      let usersRes;
      try {
        usersRes = await makeReq(cookie);
      } catch (err) {
        if (err.response?.status === 401) {
          sessionCache.delete(app.id);
          cookie = await getAdminSession(baseUrl, token, app.id);
          usersRes = await makeReq(cookie);
        } else {
          throw err;
        }
      }

      const users = Array.isArray(usersRes.data) ? usersRes.data : [];

      let cipherCounts = {};
      try {
        const overviewRes = await axios.get(`${baseUrl}/admin/users/overview`, {
          headers: makeHeaders(cookie), timeout: 10000,
        });
        if (typeof overviewRes.data === 'string') {
          const html = overviewRes.data;
          for (const u of users) {
            const emailIdx = html.indexOf(`data-vw-user-email="${u.email}"`);
            if (emailIdx === -1) continue;
            const rowStart = html.lastIndexOf('<tr>', emailIdx);
            const rowEnd = html.indexOf('</tr>', emailIdx);
            if (rowStart === -1 || rowEnd === -1) continue;
            const row = html.substring(rowStart, rowEnd);
            const spans = [...row.matchAll(/<span class="d-block">(\d+)<\/span>/g)];
            if (spans.length > 0) {
              cipherCounts[u.id] = parseInt(spans[0][1]);
            }
          }
        }
      } catch (_) {}

      let totalItems = 0;
      let twofaCount = 0;
      const orgSet = new Set();

      for (const u of users) {
        const userCiphers = cipherCounts[u.id] || 0;
        totalItems += userCiphers;
        if (u.twoFactorEnabled) twofaCount++;
        if (u.organizations) u.organizations.forEach(o => orgSet.add(o.name || o.id));
      }

      return {
        status: 'online',
        response_time: responseTime,
        users: users.length,
        items: totalItems,
        organizations: orgSet.size,
        twofa_users: twofaCount,
        twofa_pct: users.length > 0 ? Math.round((twofaCount / users.length) * 100) : 0,
        user_list: users.map(u => ({
          name: u.name || u.email,
          email: u.email,
          items: cipherCounts[u.id] || 0,
          twofa: !!u.twoFactorEnabled,
          last_active: u.lastActive || null,
        })).slice(0, 50),
      };
    } catch (err) {
      if (err.response?.status === 429) {
        rateLimitUntil.set(app.id, Date.now() + 5 * 60 * 1000);
        sessionCache.delete(app.id);
      }
      return {
        status: 'online',
        response_time: responseTime,
        admin_error: err.response?.status === 401 ? 'Invalid admin token'
          : err.response?.status === 429 ? 'Rate limited — retrying in 5min'
          : err.message,
      };
    }
  },

  historyKeys: ['response_time', 'users', 'items'],
};
