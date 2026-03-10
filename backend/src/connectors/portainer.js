const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

module.exports = {
  type: 'portainer',
  defaultInterval: 15,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');

    // Authenticate
    let token;
    if (credential?.username && credential?.password) {
      const authRes = await axios.post(`${baseUrl}/api/auth`, {
        username: credential.username,
        password: credential.password,
      }, { timeout: 10000, httpsAgent: agent });
      token = authRes.data.jwt;
    } else if (credential?.api_key) {
      token = credential.api_key;
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000, httpsAgent: agent });

    const [endpointsRes, stacksRes] = await Promise.all([
      client.get('/api/endpoints'),
      client.get('/api/stacks').catch(() => ({ data: [] })),
    ]);

    const endpoints = endpointsRes.data;
    const stacks = stacksRes.data;

    // Get containers, images, volumes for each endpoint
    let totalContainers = 0;
    let runningContainers = 0;
    let allRunningContainers = [];
    let totalImages = 0;
    let totalVolumes = 0;

    for (const ep of endpoints.slice(0, 5)) { // Limit to first 5 endpoints
      try {
        const containersRes = await client.get(
          `/api/endpoints/${ep.Id}/docker/containers/json?all=1`
        );
        const containers = containersRes.data;
        totalContainers += containers.length;
        const running = containers.filter(c => c.State === 'running');
        runningContainers += running.length;
        allRunningContainers = allRunningContainers.concat(running);
      } catch {}

      try {
        const imagesRes = await client.get(`/api/endpoints/${ep.Id}/docker/images/json`);
        totalImages += (imagesRes.data || []).length;
      } catch {}

      try {
        const volumesRes = await client.get(`/api/endpoints/${ep.Id}/docker/volumes`);
        totalVolumes += (volumesRes.data?.Volumes || []).length;
      } catch {}
    }

    const containerList = allRunningContainers.slice(0, 8).map(c => ({
      name: (c.Names?.[0] || 'unknown').replace(/^\//, ''),
      image: c.Image || 'unknown',
      state: c.State || 'unknown',
    }));

    return {
      status: 'online',
      environments: endpoints.length,
      stacks: stacks.length,
      containers: totalContainers,
      running: runningContainers,
      stopped: totalContainers - runningContainers,
      images: totalImages,
      volumes: totalVolumes,
      container_list: containerList,
    };
  },

  historyKeys: ['containers', 'running'],
};
