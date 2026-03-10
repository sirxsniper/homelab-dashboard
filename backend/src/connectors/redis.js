module.exports = {
  type: 'redis_server',
  defaultInterval: 15,

  async fetch(app, credential) {
    const Redis = require('ioredis');

    const host = credential?.host || new URL(app.url).hostname;
    const port = parseInt(credential?.port) || 6379;

    const redis = new Redis({
      host,
      port,
      password: credential?.password || undefined,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      const info = await redis.info();

      // Parse INFO response
      const parsed = {};
      for (const line of info.split('\r\n')) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            parsed[key.trim()] = value.trim();
          }
        }
      }

      const hits = parseInt(parsed.keyspace_hits) || 0;
      const misses = parseInt(parsed.keyspace_misses) || 0;
      const hitRate = (hits + misses) > 0
        ? parseFloat(((hits / (hits + misses)) * 100).toFixed(1))
        : 0;

      // Count total keys across all dbs
      let totalKeys = 0;
      for (const [key, value] of Object.entries(parsed)) {
        if (key.startsWith('db') && value.includes('keys=')) {
          const match = value.match(/keys=(\d+)/);
          if (match) totalKeys += parseInt(match[1]);
        }
      }

      return {
        status: 'online',
        version: parsed.redis_version || null,
        connected_clients: parseInt(parsed.connected_clients) || 0,
        ops_per_sec: parseInt(parsed.instantaneous_ops_per_sec) || 0,
        memory_used: parseInt(parsed.used_memory) || 0,
        memory_human: parsed.used_memory_human || 'Unknown',
        total_keys: totalKeys,
        hit_rate: hitRate,
        uptime_seconds: parseInt(parsed.uptime_in_seconds) || 0,
        mode: parsed.redis_mode || 'standalone',
      };
    } finally {
      redis.disconnect();
    }
  },

  historyKeys: ['connected_clients', 'ops_per_sec', 'memory_used'],
};
