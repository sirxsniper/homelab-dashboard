const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const fmtBytes = (bytes) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 ** 4) return `${(bytes / (1024 ** 4)).toFixed(1)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

module.exports = {
  type: 'portainer',
  defaultInterval: 15,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');

    const start = Date.now();

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
    const stacks = Array.isArray(stacksRes.data) ? stacksRes.data : [];

    let totalContainers = 0;
    let runningContainers = 0;
    let stoppedContainers = 0;
    let allContainers = [];
    let totalImages = 0;
    let totalImageSize = 0;
    let totalVolumes = 0;
    let totalNetworks = 0;
    let dockerVersion = null;

    for (const ep of endpoints.slice(0, 5)) {
      // Docker info (version, resources)
      if (!dockerVersion) {
        try {
          const infoRes = await client.get(`/api/endpoints/${ep.Id}/docker/info`);
          const info = infoRes.data;
          dockerVersion = info.ServerVersion || null;
        } catch {}
      }

      // Containers
      try {
        const containersRes = await client.get(
          `/api/endpoints/${ep.Id}/docker/containers/json?all=1`
        );
        const containers = containersRes.data || [];
        totalContainers += containers.length;
        for (const c of containers) {
          if (c.State === 'running') runningContainers++;
          else stoppedContainers++;
          allContainers.push(c);
        }
      } catch {}

      // Images
      try {
        const imagesRes = await client.get(`/api/endpoints/${ep.Id}/docker/images/json`);
        const imgs = imagesRes.data || [];
        totalImages += imgs.length;
        for (const img of imgs) {
          totalImageSize += img.Size || 0;
        }
      } catch {}

      // Volumes
      try {
        const volumesRes = await client.get(`/api/endpoints/${ep.Id}/docker/volumes`);
        totalVolumes += (volumesRes.data?.Volumes || []).length;
      } catch {}

      // Networks
      try {
        const netsRes = await client.get(`/api/endpoints/${ep.Id}/docker/networks`);
        const nets = netsRes.data || [];
        totalNetworks += nets.filter(n => !['bridge', 'host', 'none'].includes(n.Name)).length;
      } catch {}
    }

    const responseTime = Date.now() - start;

    // Build container list with more detail
    const containerList = allContainers
      .sort((a, b) => {
        if (a.State === 'running' && b.State !== 'running') return -1;
        if (a.State !== 'running' && b.State === 'running') return 1;
        return (a.Names?.[0] || '').localeCompare(b.Names?.[0] || '');
      })
      .map(c => {
        const created = c.Created ? c.Created * 1000 : null;
        const uptime = c.State === 'running' && created ? Date.now() - created : null;
        const ports = (c.Ports || [])
          .filter(p => p.PublicPort)
          .map(p => `${p.PublicPort}:${p.PrivatePort}`)
          .slice(0, 3);

        return {
          name: (c.Names?.[0] || 'unknown').replace(/^\//, ''),
          image: c.Image || 'unknown',
          state: c.State || 'unknown',
          status: c.Status || '',
          ports,
          uptime,
        };
      });

    // Stack details
    const stackList = stacks.map(s => ({
      name: s.Name,
      status: s.Status === 1 ? 'active' : 'inactive',
      type: s.Type === 1 ? 'swarm' : s.Type === 2 ? 'compose' : 'unknown',
    }));

    return {
      status: 'online',
      response_time: responseTime,
      docker_version: dockerVersion,
      environments: endpoints.length,
      stacks: stacks.length,
      stack_list: stackList,
      containers: totalContainers,
      running: runningContainers,
      stopped: stoppedContainers,
      images: totalImages,
      image_size: fmtBytes(totalImageSize),
      image_size_bytes: totalImageSize,
      volumes: totalVolumes,
      networks: totalNetworks,
      container_list: containerList,
    };
  },

  historyKeys: ['containers', 'running'],
};
