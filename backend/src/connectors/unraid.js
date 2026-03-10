const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

/** Run nvidia-smi over SSH and return parsed GPU data, or null on failure */
async function fetchGpuViaSsh(appUrl, credential) {
  // Need either key-based or password-based SSH
  const sshUser = credential?.ssh_user || 'root';
  const sshHost = credential?.ssh_host || appUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '');

  // Try to load SSH private key
  let privateKey = null;
  const keyPath = path.join(process.env.HOME || '/root', '.ssh', 'id_ed25519');
  try { privateKey = fs.readFileSync(keyPath); } catch {}

  const sshPassword = credential?.ssh_password;
  if (!privateKey && !sshPassword) return null;

  return new Promise((resolve) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); resolve(null); }, 8000);

    conn.on('ready', () => {
      const cmd = 'nvidia-smi --query-gpu=name,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,temperature.gpu,power.draw,power.limit,fan.speed,driver_version --format=csv,noheader,nounits 2>/dev/null';
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); resolve(null); return; }
        let out = '';
        stream.on('data', (d) => { out += d; });
        stream.stderr.on('data', () => {});
        stream.on('close', () => {
          clearTimeout(timer);
          conn.end();
          try {
            const gpus = out.trim().split('\n').filter(Boolean).map(line => {
              const p = line.split(',').map(s => s.trim());
              return {
                name: p[0] || 'Unknown',
                gpu_usage: parseFloat(p[1]) || 0,
                mem_usage: parseFloat(p[2]) || 0,
                vram_total_mb: parseFloat(p[3]) || 0,
                vram_used_mb: parseFloat(p[4]) || 0,
                vram_free_mb: parseFloat(p[5]) || 0,
                temp: parseFloat(p[6]) || 0,
                power_draw: parseFloat(p[7]) || 0,
                power_limit: parseFloat(p[8]) || 0,
                fan_speed: p[9] === '[N/A]' ? null : parseFloat(p[9]) || 0,
                driver_version: p[10] || '',
              };
            });
            resolve(gpus.length > 0 ? gpus : null);
          } catch { resolve(null); }
        });
      });
    });

    conn.on('error', () => { clearTimeout(timer); resolve(null); });

    const connOpts = { host: sshHost, port: 22, username: sshUser, readyTimeout: 5000 };
    if (privateKey) connOpts.privateKey = privateKey;
    if (sshPassword) connOpts.password = sshPassword;
    conn.connect(connOpts);
  });
}

module.exports = {
  type: 'unraid',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const apiKey = credential?.api_key;

    if (!apiKey) {
      throw new Error('Unraid requires an API key (Settings → Management Access → API)');
    }

    const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

    const query = `{
      online
      info {
        os { hostname uptime }
        cpu {
          manufacturer brand cores threads speed speedmax
          packages { totalPower temp }
        }
        memory { layout { size type } }
      }
      metrics {
        cpu { percentTotal }
        memory { total used free available percentTotal }
      }
      array {
        state
        capacity { kilobytes { free used total } }
        caches { name size status fsType fsSize fsFree }
      }
      docker { containers { names state } }
      disks { name size type device temperature }
      shares { name free used }
    }`;

    // Fetch GraphQL + GPU in parallel
    const gpuPromise = fetchGpuViaSsh(baseUrl, credential);

    // Retry once on DNS failures (EAI_AGAIN common in LXC containers)
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await axios.post(`${baseUrl}/graphql`, { query }, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          httpsAgent: agent,
          timeout: 15000,
        });
        break;
      } catch (err) {
        if (attempt === 0 && err.code === 'EAI_AGAIN') {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }

    const d = res.data?.data;
    if (!d) throw new Error('Empty response from Unraid GraphQL API');

    // CPU info + live metrics
    const cpu = d.info?.cpu || {};
    const cpuMetrics = d.metrics?.cpu || {};
    const cpuPkg = cpu.packages || {};
    const cpuUsage = parseFloat((cpuMetrics.percentTotal || 0).toFixed(1));
    const cpuTemp = cpuPkg.temp?.length > 0 ? Math.round(cpuPkg.temp[0]) : null;
    const cpuPower = cpuPkg.totalPower ? parseFloat(cpuPkg.totalPower.toFixed(1)) : null;

    // Memory: layout for total, metrics for live usage
    const memLayout = d.info?.memory?.layout || [];
    const totalMemBytes = memLayout.reduce((sum, m) => sum + (m.size || 0), 0);
    const totalMemGB = parseFloat((totalMemBytes / (1024 ** 3)).toFixed(1));
    const memMetrics = d.metrics?.memory || {};
    const ramUsedGB = memMetrics.used ? parseFloat((memMetrics.used / (1024 ** 3)).toFixed(1)) : 0;
    const ramFreeGB = memMetrics.free ? parseFloat((memMetrics.free / (1024 ** 3)).toFixed(1)) : 0;
    const ramUsePct = parseFloat((memMetrics.percentTotal || 0).toFixed(1));

    // Docker containers
    const containers = d.docker?.containers || [];
    const dockerRunning = containers.filter(c => c.state === 'RUNNING').length;

    // Array capacity (in kilobytes as strings)
    const arrayCap = d.array?.capacity?.kilobytes || {};

    // Pools from caches — use fsSize/fsFree for usable storage (only primary disks have these)
    const caches = d.array?.caches || [];
    const poolMap = {};
    for (const c of caches) {
      const baseName = c.name.replace(/[~].*$/, '').replace(/\d+$/, '') || c.name;
      if (!poolMap[baseName]) {
        poolMap[baseName] = { rawKB: 0, fsSizeKB: 0, fsFreeKB: 0, diskCount: 0, allOk: true, fsType: null };
      }
      poolMap[baseName].rawKB += (c.size || 0);
      poolMap[baseName].diskCount++;
      if (c.status !== 'DISK_OK') poolMap[baseName].allOk = false;
      if (c.fsSize) {
        poolMap[baseName].fsSizeKB = c.fsSize;
        poolMap[baseName].fsFreeKB = c.fsFree || 0;
        poolMap[baseName].fsType = c.fsType;
      }
    }

    const pools = Object.entries(poolMap).map(([name, p]) => {
      const totalTB = parseFloat((p.fsSizeKB / (1024 ** 3)).toFixed(2));
      const freeTB = parseFloat((p.fsFreeKB / (1024 ** 3)).toFixed(2));
      const usedTB = parseFloat((totalTB - freeTB).toFixed(2));
      const usePct = totalTB > 0 ? parseFloat(((usedTB / totalTB) * 100).toFixed(1)) : 0;
      return { name, totalTB, usedTB, freeTB, usePct, disks: p.diskCount, healthy: p.allOk, fsType: p.fsType };
    });

    // Aggregate usable storage across all pools
    const totalUsableTB = parseFloat(pools.reduce((s, p) => s + p.totalTB, 0).toFixed(1));
    const totalUsedTB = parseFloat(pools.reduce((s, p) => s + p.usedTB, 0).toFixed(1));
    const totalFreeTB = parseFloat(pools.reduce((s, p) => s + p.freeTB, 0).toFixed(1));

    // Disks summary with temperatures
    const disks = d.disks || [];
    const hdCount = disks.filter(dk => dk.type === 'HD').length;
    const ssdCount = disks.filter(dk => dk.type === 'SSD').length;
    const nvmeCount = disks.filter(dk => dk.type === 'NVMe').length;
    const totalRawBytes = disks.reduce((s, dk) => s + (dk.size || 0), 0);
    const totalRawTB = parseFloat((totalRawBytes / (1024 ** 4)).toFixed(1));

    // Drive temps (only drives that report temperature)
    const driveTemps = disks
      .filter(dk => dk.temperature != null)
      .map(dk => ({ name: dk.name.substring(0, 20), temp: dk.temperature, type: dk.type }));

    // Uptime
    const uptimeDate = d.info?.os?.uptime;
    let uptimeDays = 0;
    if (uptimeDate) {
      uptimeDays = Math.floor((Date.now() - new Date(uptimeDate).getTime()) / 86400000);
    }

    // GPU data (from SSH nvidia-smi)
    const gpus = await gpuPromise;
    const gpu = gpus?.[0] || null;

    const result = {
      status: d.online ? 'online' : 'degraded',
      hostname: d.info?.os?.hostname || 'Unraid',
      cpu_model: cpu.brand || 'Unknown',
      cpu_cores: cpu.cores || 0,
      cpu_threads: cpu.threads || 0,
      cpu_speed: cpu.speed || 0,
      cpu_speed_max: cpu.speedmax || 0,
      cpu_usage: cpuUsage,
      cpu_temp: cpuTemp,
      cpu_power: cpuPower,
      ram_total_gb: totalMemGB,
      ram_used_gb: ramUsedGB,
      ram_free_gb: ramFreeGB,
      ram_usage: ramUsePct,
      array_state: d.array?.state || 'unknown',
      docker_running: dockerRunning,
      docker_total: containers.length,
      pools,
      total_usable_tb: totalUsableTB,
      total_used_tb: totalUsedTB,
      total_free_tb: totalFreeTB,
      total_raw_tb: totalRawTB,
      disks_hd: hdCount,
      disks_ssd: ssdCount,
      disks_nvme: nvmeCount,
      drive_temps: driveTemps,
      shares_count: (d.shares || []).length,
      uptime_days: uptimeDays,
      containers: containers.map(c => ({
        name: (c.names?.[0] || '').replace(/^\//, ''),
        state: c.state,
      })),
    };

    // Attach GPU data if available
    if (gpu) {
      result.gpu = {
        name: gpu.name,
        usage: gpu.gpu_usage,
        mem_usage: gpu.mem_usage,
        vram_total_mb: gpu.vram_total_mb,
        vram_used_mb: gpu.vram_used_mb,
        vram_free_mb: gpu.vram_free_mb,
        temp: gpu.temp,
        power_draw: gpu.power_draw,
        power_limit: gpu.power_limit,
        fan_speed: gpu.fan_speed,
        driver_version: gpu.driver_version,
      };
      result.gpu_usage = gpu.gpu_usage;
      result.gpu_temp = gpu.temp;
    }

    return result;
  },

  historyKeys: ['cpu_usage', 'ram_usage', 'cpu_temp', 'gpu_usage', 'gpu_temp', 'docker_running', 'total_used_tb'],
};
