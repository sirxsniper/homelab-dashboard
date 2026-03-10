const axios = require('axios');

module.exports = {
  type: 'nginx_proxy',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');

    // Authenticate to get bearer token
    let token;
    if (credential?.email && credential?.password) {
      try {
        const authRes = await axios.post(`${baseUrl}/api/tokens`, {
          identity: credential.email,
          secret: credential.password,
        }, { timeout: 10000 });

        // NPM returns the token directly or nested
        token = authRes.data?.token || authRes.data?.result?.token;
      } catch (authErr) {
        // If 2FA is required, NPM returns 401 with a specific message
        // or the login might fail — try using api_key directly if provided
        if (credential?.api_key) {
          token = credential.api_key;
        } else {
          throw new Error(
            authErr.response?.status === 401
              ? 'Auth failed — if 2FA is enabled on NPM, use an API token instead of email/password'
              : `NPM auth failed: ${authErr.response?.status || authErr.message}`
          );
        }
      }
    } else if (credential?.api_key) {
      // Direct token/api key — bypass login entirely (best for 2FA accounts)
      token = credential.api_key;
    }

    if (!token) {
      throw new Error('No valid credentials — provide email/password or an API token');
    }

    const headers = { Authorization: `Bearer ${token}` };
    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    // Try multiple endpoint patterns (varies by NPM version)
    let hosts = [];
    let certs = [];

    // Fetch proxy hosts
    try {
      const hostsRes = await client.get('/api/nginx/proxy-hosts');
      hosts = hostsRes.data;
    } catch (e) {
      // Try without /nginx prefix (some versions)
      try {
        const hostsRes = await client.get('/api/proxy-hosts');
        hosts = hostsRes.data;
      } catch {
        throw new Error(`Failed to fetch proxy hosts: ${e.response?.status || e.message}`);
      }
    }

    // Fetch certificates
    try {
      const certsRes = await client.get('/api/nginx/certificates');
      certs = certsRes.data;
    } catch {
      try {
        const certsRes = await client.get('/api/certificates');
        certs = certsRes.data;
      } catch {
        // Certificates endpoint is optional — don't fail entirely
        certs = [];
      }
    }

    // Fetch additional endpoints
    let redirects = 0;
    let streamsCount = 0;
    let deadHosts = 0;
    try {
      const [redirectsRes, streamsRes, deadRes] = await Promise.all([
        client.get('/api/nginx/redirection-hosts').catch(() => ({ data: [] })),
        client.get('/api/nginx/streams').catch(() => ({ data: [] })),
        client.get('/api/nginx/dead-hosts').catch(() => ({ data: [] })),
      ]);
      redirects = Array.isArray(redirectsRes.data) ? redirectsRes.data.length : 0;
      streamsCount = Array.isArray(streamsRes.data) ? streamsRes.data.length : 0;
      deadHosts = Array.isArray(deadRes.data) ? deadRes.data.length : 0;
    } catch { /* skip */ }

    // SSL detection: certificate_id can be a number >0 or a truthy string/object
    const hasSSL = (h) => !!(h.certificate_id && h.certificate_id !== 0 && h.certificate_id !== '0');
    // Enabled detection: could be 1, true, or "1"
    const isEnabled = (h) => h.enabled === 1 || h.enabled === true || h.enabled === '1';

    const sslHosts = hosts.filter(hasSSL).length;
    const expiringCerts = certs.filter(c => {
      if (!c.expires_on) return false;
      const daysLeft = (new Date(c.expires_on) - Date.now()) / 86400000;
      return daysLeft < 14;
    });

    return {
      status: 'online',
      proxy_hosts: hosts.length,
      ssl_hosts: sslHosts,
      certificates: certs.length,
      expiring_soon: expiringCerts.length,
      redirects,
      streams_count: streamsCount,
      dead_hosts: deadHosts,
      hosts: hosts.map(h => ({
        domain: h.domain_names?.join(', '),
        ssl: hasSSL(h),
        enabled: isEnabled(h),
      })),
    };
  },

  historyKeys: ['proxy_hosts', 'certificates'],
};
