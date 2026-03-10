const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const sessionCache = new Map();
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

function buildBase(app) {
  const url = app.url.replace(/\/$/, '');
  const isUnifiOs = !/:8443/.test(url);
  const site = app.config?.site || 'default';
  const apiPrefix = isUnifiOs ? `${url}/proxy/network/api` : `${url}/api`;
  const loginUrl = isUnifiOs ? `${url}/api/auth/login` : `${url}/api/login`;
  return { url, isUnifiOs, site, apiPrefix, loginUrl };
}

async function login(base, credential) {
  const res = await axios.post(base.loginUrl, {
    username: credential.username,
    password: credential.password,
  }, {
    httpsAgent,
    timeout: 10000,
    withCredentials: true,
    maxRedirects: 0,
    validateStatus: s => s < 400,
  });

  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('UniFi login failed: no session cookie');
  const cookies = setCookie.map(c => c.split(';')[0]).join('; ');
  return cookies;
}

async function getSession(app, credential) {
  const cached = sessionCache.get(app.id);
  if (cached && Date.now() < cached.expiry) return cached.cookies;

  const base = buildBase(app);
  const cookies = await login(base, credential);
  sessionCache.set(app.id, { cookies, expiry: Date.now() + SESSION_TTL });
  return cookies;
}

function clearSession(appId) {
  sessionCache.delete(appId);
}

function makeClient(base, cookies) {
  return axios.create({
    baseURL: `${base.apiPrefix}/s/${base.site}`,
    httpsAgent,
    timeout: 10000,
    headers: { Cookie: cookies },
  });
}

async function withRetry(app, credential, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.response?.status === 401) {
      clearSession(app.id);
      const base = buildBase(app);
      const cookies = await login(base, credential);
      sessionCache.set(app.id, { cookies, expiry: Date.now() + SESSION_TTL });
      return await fn(cookies);
    }
    throw err;
  }
}

function fmtUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function bytesPerSecToMbps(bps) {
  if (!bps) return 0;
  return (bps * 8) / 1000000;
}

function categorizeDevices(devices) {
  const result = { aps: [], switches: [], gateways: [], others: [] };
  for (const d of devices) {
    const item = {
      mac: d.mac,
      name: d.name || d.hostname || d.mac,
      model: d.model || '?',
      type: d.type,
      ip: d.ip || '—',
      version: d.version || '—',
      state: d.state === 1 ? 'online' : d.state === 0 ? 'offline' : 'pending',
      uptime: d.uptime || 0,
      uptime_fmt: fmtUptime(d.uptime),
      clients: (d.user_num_sta || 0) + (d.guest_num_sta || 0),
      tx_rate: d['tx_bytes-r'] || 0,
      rx_rate: d['rx_bytes-r'] || 0,
    };
    if (d.type === 'uap') result.aps.push(item);
    else if (d.type === 'usw') result.switches.push(item);
    else if (d.type === 'ugw' || d.type === 'udm') result.gateways.push(item);
    else result.others.push(item);
  }
  return result;
}

module.exports = {
  type: 'unifi',
  defaultInterval: 5,

  async fetch(app, credential) {
    const base = buildBase(app);
    const start = Date.now();
    const cookies = await getSession(app, credential);
    const client = makeClient(base, cookies);

    const doFetch = async (overrideCookies) => {
      const c = overrideCookies ? makeClient(base, overrideCookies) : client;

      const [healthRes, deviceRes, clientRes] = await Promise.all([
        c.get('/stat/health'),
        c.get('/stat/device'),
        c.get('/stat/sta'),
      ]);

      const healthData = healthRes.data?.data || [];
      const devices = deviceRes.data?.data || [];
      const clients = clientRes.data?.data || [];

      const wan = healthData.find(h => h.subsystem === 'wan') || {};
      const wlan = healthData.find(h => h.subsystem === 'wlan') || {};
      const lan = healthData.find(h => h.subsystem === 'lan') || {};
      const www = healthData.find(h => h.subsystem === 'www') || {};

      const wiredClients = clients.filter(c => c.is_wired);
      const wirelessClients = clients.filter(c => !c.is_wired);

      const gwStats = wan['gw_system-stats'] || {};

      const categorized = categorizeDevices(devices);
      const allDevices = [...categorized.gateways, ...categorized.switches, ...categorized.aps, ...categorized.others];

      return {
        status: 'online',
        wan_ip: wan.wan_ip || '—',
        wan_status: wan.status || 'unknown',
        isp: wan.isp_name || '—',
        wan_down: wan.xput_down || 0,
        wan_up: wan.xput_up || 0,
        wan_ping: wan.speedtest_ping || www.speedtest_ping || 0,
        wan_latency: www.latency || wan.uptime_stats?.WAN?.latency_average || 0,
        wan_availability: wan.uptime_stats?.WAN?.availability ?? 100,
        wan_tx: bytesPerSecToMbps(wan['tx_bytes-r']),
        wan_rx: bytesPerSecToMbps(wan['rx_bytes-r']),
        speedtest_lastrun: wan.speedtest_lastrun || 0,
        gw_name: wan.gw_name || '—',
        gw_version: wan.gw_version || '—',
        gw_cpu: parseFloat(gwStats.cpu) || 0,
        gw_mem: parseFloat(gwStats.mem) || 0,
        gw_uptime: parseInt(gwStats.uptime) || 0,
        gw_uptime_fmt: fmtUptime(parseInt(gwStats.uptime) || 0),
        total_clients: clients.length,
        wired_clients: wiredClients.length,
        wireless_clients: wirelessClients.length,
        guest_clients: (wlan.num_guest || 0) + (lan.num_guest || 0),
        total_devices: devices.length,
        aps: categorized.aps.length,
        switches: categorized.switches.length,
        gateways: categorized.gateways.length,
        devices: allDevices.slice(0, 30),
        top_clients: clients
          .map(c => ({
            mac: c.mac,
            name: c.name || c.hostname || c.mac,
            ip: c.ip || '—',
            is_wired: c.is_wired,
            signal: c.signal || null,
            essid: c.essid || null,
            tx_bytes: c.tx_bytes || 0,
            rx_bytes: c.rx_bytes || 0,
            uptime: c.uptime || 0,
            uptime_fmt: fmtUptime(c.uptime),
          }))
          .sort((a, b) => (b.tx_bytes + b.rx_bytes) - (a.tx_bytes + a.rx_bytes))
          .slice(0, 50),
        wlan_tx: bytesPerSecToMbps(wlan['tx_bytes-r']),
        wlan_rx: bytesPerSecToMbps(wlan['rx_bytes-r']),
        lan_status: lan.status || 'unknown',
        wlan_status: wlan.status || 'unknown',
        response_time: Date.now() - start,
      };
    };

    return await withRetry(app, credential, doFetch);
  },

  historyKeys: ['total_clients', 'gw_cpu', 'gw_mem', 'wan_rx', 'wan_tx'],
};
