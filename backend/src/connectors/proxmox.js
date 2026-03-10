const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const agent = new https.Agent({ rejectUnauthorized: false });

/** Fetch Intel/AMD GPU data over SSH using sysfs + intel_gpu_top */
async function fetchGpuViaSsh(credential) {
  const sshHost = credential?.ssh_host;
  if (!sshHost) return null;

  const sshUser = credential?.ssh_user || 'root';

  let privateKey = null;
  const keyPath = path.join(process.env.HOME || '/root', '.ssh', 'id_ed25519');
  try { privateKey = fs.readFileSync(keyPath); } catch {}

  const sshPassword = credential?.ssh_password;
  if (!privateKey && !sshPassword) return null;

  return new Promise((resolve) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); resolve(null); }, 10000);

    conn.on('ready', () => {
      // Single script that discovers GPUs from sysfs and reads all sensors
      const cmd = `
for card in /sys/class/drm/card[0-9]; do
  cn=$(basename $card)
  vendor=$(cat $card/device/vendor 2>/dev/null)
  pcipath=$(basename $(readlink $card/device) 2>/dev/null)
  devname=$(lspci -s $pcipath 2>/dev/null | sed 's/^[^ ]* //')
  hw=$(ls -d $card/device/hwmon/hwmon* 2>/dev/null | head -1)
  temp=$(cat $hw/temp1_input 2>/dev/null || echo 0)
  fan=$(cat $hw/fan1_input 2>/dev/null || echo -1)
  freq_cur=$(cat $card/gt_cur_freq_mhz 2>/dev/null || echo 0)
  freq_max=$(cat $card/gt_max_freq_mhz 2>/dev/null || echo 0)
  energy=$(cat $hw/energy1_input 2>/dev/null || echo -1)
  power_in=$(cat $hw/power1_input 2>/dev/null || echo -1)
  vram_total=$(cat $card/device/mem_info_vram_total 2>/dev/null || echo 0)
  vram_used=$(cat $card/device/mem_info_vram_used 2>/dev/null || echo 0)
  echo "GPU|$cn|$vendor|$devname|$temp|$fan|$freq_cur|$freq_max|$energy|$power_in|$vram_total|$vram_used"
done
`;
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); resolve(null); return; }
        let out = '';
        stream.on('data', (d) => { out += d; });
        stream.stderr.on('data', () => {});
        stream.on('close', () => {
          clearTimeout(timer);

          // Now get power via energy delta (needs second reading after 1s)
          const gpuLines = out.trim().split('\n').filter(l => l.startsWith('GPU|'));
          if (gpuLines.length === 0) { conn.end(); resolve(null); return; }

          // Take a second energy reading 1s later for power calculation
          const energyCmd = `
for card in /sys/class/drm/card[0-9]; do
  cn=$(basename $card)
  hw=$(ls -d $card/device/hwmon/hwmon* 2>/dev/null | head -1)
  echo "E|$cn|$(cat $hw/energy1_input 2>/dev/null || echo -1)"
done
`;
          setTimeout(() => {
            conn.exec(energyCmd, (err2, stream2) => {
              if (err2) { conn.end(); resolve(parseGpuLines(gpuLines, {})); return; }
              let out2 = '';
              stream2.on('data', (d) => { out2 += d; });
              stream2.on('close', () => {
                conn.end();
                // Build energy2 map
                const energy2 = {};
                for (const line of out2.trim().split('\n')) {
                  const parts = line.split('|');
                  if (parts[0] === 'E') energy2[parts[1]] = parseInt(parts[2]);
                }
                resolve(parseGpuLines(gpuLines, energy2));
              });
            });
          }, 1000);
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

function parseGpuLines(lines, energy2Map) {
  const gpus = [];
  for (const line of lines) {
    const p = line.split('|');
    // GPU|cardN|vendor|devname|temp|fan|freq_cur|freq_max|energy1|power_in|vram_total|vram_used
    const cardName = p[1];
    const vendor = p[2];
    const devname = (p[3] || '').trim();
    const tempMilli = parseInt(p[4]) || 0;
    const fan = parseInt(p[5]);
    const freqCur = parseInt(p[6]) || 0;
    const freqMax = parseInt(p[7]) || 0;
    const energy1 = parseInt(p[8]);
    const powerIn = parseInt(p[9]);
    const vramTotal = parseInt(p[10]) || 0;
    const vramUsed = parseInt(p[11]) || 0;

    // Skip if no useful data (onboard display without sensors)
    if (tempMilli === 0 && freqCur === 0) continue;

    // Calculate power: prefer power1_input (µW), else energy delta (µJ)
    let powerW = null;
    if (powerIn > 0) {
      powerW = parseFloat((powerIn / 1000000).toFixed(1));
    } else if (energy1 > 0 && energy2Map[cardName] > 0) {
      const deltaUJ = energy2Map[cardName] - energy1;
      powerW = parseFloat((deltaUJ / 1000000).toFixed(1)); // µJ over 1s = µW → W
    }

    // Determine GPU type from vendor
    let gpuType = 'unknown';
    if (vendor === '0x8086') gpuType = 'intel';
    else if (vendor === '0x1002') gpuType = 'amd';
    else if (vendor === '0x10de') gpuType = 'nvidia';

    // Parse name from lspci output — extract last bracket content like [Arc A380] or [Radeon Graphics]
    let name = devname;
    const allBrackets = [...devname.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    if (allBrackets.length > 0) {
      // Use last bracket (usually the model name, not the vendor)
      name = allBrackets[allBrackets.length - 1];
    }

    gpus.push({
      name,
      type: gpuType,
      vendor,
      temp: Math.round(tempMilli / 1000),
      fan_rpm: fan >= 0 ? fan : null,
      freq_mhz: freqCur,
      freq_max_mhz: freqMax,
      power_draw: powerW,
      vram_total_mb: vramTotal > 0 ? Math.round(vramTotal / 1024 / 1024) : null,
      vram_used_mb: vramUsed > 0 ? Math.round(vramUsed / 1024 / 1024) : null,
    });
  }
  return gpus.length > 0 ? gpus : null;
}

module.exports = {
  type: 'proxmox',
  defaultInterval: 5,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_token) {
      headers['Authorization'] = `PVEAPIToken=${credential.api_token}`;
    }

    const client = axios.create({
      baseURL: `${baseUrl}/api2/json`,
      headers,
      httpsAgent: agent,
      timeout: 10000,
    });

    // Fetch API + GPU in parallel
    const gpuPromise = fetchGpuViaSsh(credential);

    const [nodesRes, versionRes] = await Promise.all([
      client.get('/nodes'),
      client.get('/version'),
    ]);

    const nodes = nodesRes.data.data;
    const version = versionRes.data.data;

    const nodeDetails = await Promise.all(
      nodes.map(async (node) => {
        // Try to get detailed node status (requires Sys.Audit on /nodes/{node})
        let cpuPct = Math.round((node.cpu || 0) * 100);
        let ram = {
          used: Math.round((node.mem || 0) / 1024 / 1024 / 1024 * 10) / 10,
          total: Math.round((node.maxmem || 0) / 1024 / 1024 / 1024 * 10) / 10,
        };
        let uptime = node.uptime || 0;

        // If /nodes listing didn't include cpu/mem, try /nodes/{node}/status
        if (!node.cpu && !node.mem) {
          try {
            const statusRes = await client.get(`/nodes/${node.node}/status`);
            const s = statusRes.data.data;
            cpuPct = Math.round((s.cpu || 0) * 100);
            ram = {
              used: Math.round((s.memory?.used || 0) / 1024 / 1024 / 1024 * 10) / 10,
              total: Math.round((s.memory?.total || 0) / 1024 / 1024 / 1024 * 10) / 10,
            };
            uptime = s.uptime || uptime;
          } catch {}
        }

        // Fetch VMs, LXCs, and storage (handle 403 gracefully)
        const [qemuRes, lxcRes, nodeStorageRes] = await Promise.all([
          client.get(`/nodes/${node.node}/qemu`).catch(() => ({ data: { data: [] } })),
          client.get(`/nodes/${node.node}/lxc`).catch(() => ({ data: { data: [] } })),
          client.get(`/nodes/${node.node}/storage`).catch(() => ({ data: { data: [] } })),
        ]);

        const storages = nodeStorageRes.data.data.map(s => ({
          name: s.storage,
          type: s.type,
          total_gb: Math.round((s.total || 0) / 1024 / 1024 / 1024 * 10) / 10,
          used_gb: Math.round((s.used || 0) / 1024 / 1024 / 1024 * 10) / 10,
          free_gb: Math.round((s.avail || 0) / 1024 / 1024 / 1024 * 10) / 10,
          use_pct: s.total > 0 ? Math.round((s.used || 0) / s.total * 1000) / 10 : 0,
          active: s.active === 1,
          enabled: s.enabled === 1,
          content: s.content,
        }));

        return {
          name: node.node,
          status: node.status,
          uptime,
          cpu: cpuPct,
          ram,
          storages,
          vms: qemuRes.data.data.map(vm => ({
            vmid: vm.vmid,
            name: vm.name,
            status: vm.status,
            cpu: vm.cpu,
            mem: vm.mem,
            maxmem: vm.maxmem,
          })),
          lxcs: lxcRes.data.data.map(ct => ({
            vmid: ct.vmid,
            name: ct.name,
            status: ct.status,
            cpu: ct.cpu,
            mem: ct.mem,
            maxmem: ct.maxmem,
          })),
        };
      })
    );

    // If per-node queries returned no VMs/LXCs, try /cluster/resources as fallback
    const totalFromNodes = nodeDetails.reduce((s, n) => s + n.vms.length + n.lxcs.length, 0);
    if (totalFromNodes === 0) {
      try {
        const resAll = await client.get('/cluster/resources');
        const resources = resAll.data.data || [];

        for (const r of resources) {
          if (r.type === 'node') {
            const nd = nodeDetails.find(n => n.name === r.node);
            if (nd && nd.cpu === 0 && r.cpu) {
              nd.cpu = Math.round((r.cpu || 0) * 100);
              nd.ram = {
                used: Math.round((r.mem || 0) / 1024 / 1024 / 1024 * 10) / 10,
                total: Math.round((r.maxmem || 0) / 1024 / 1024 / 1024 * 10) / 10,
              };
              nd.uptime = r.uptime || nd.uptime;
            }
          } else if (r.type === 'qemu') {
            const nd = nodeDetails.find(n => n.name === r.node);
            if (nd) nd.vms.push({ vmid: r.vmid, name: r.name, status: r.status, cpu: r.cpu, mem: r.mem, maxmem: r.maxmem });
          } else if (r.type === 'lxc') {
            const nd = nodeDetails.find(n => n.name === r.node);
            if (nd) nd.lxcs.push({ vmid: r.vmid, name: r.name, status: r.status, cpu: r.cpu, mem: r.mem, maxmem: r.maxmem });
          }
        }
      } catch {}
    }

    // Aggregate storage across all nodes
    const allStorages = nodeDetails.flatMap(n => n.storages || []);
    const zfsPools = allStorages.filter(s => s.type === 'zfspool');
    const zfsHealthy = zfsPools.length > 0 && zfsPools.every(s => s.active);

    const ramUsed = nodeDetails.reduce((sum, n) => sum + n.ram.used, 0);
    const ramTotal = nodeDetails.reduce((sum, n) => sum + n.ram.total, 0);
    const ramUsage = ramTotal > 0 ? Math.round(ramUsed / ramTotal * 1000) / 10 : 0;

    // GPU data from SSH
    const gpus = await gpuPromise;

    const result = {
      status: 'online',
      version: version.version,
      nodes: nodeDetails,
      cpu: nodeDetails.length > 0 ? nodeDetails.reduce((sum, n) => sum + n.cpu, 0) / nodeDetails.length : 0,
      ram: {
        used: ramUsed,
        total: ramTotal,
      },
      ram_usage: ramUsage,
      storages: allStorages,
      zfs_health: zfsPools.length > 0 ? (zfsHealthy ? 'Healthy' : 'Degraded') : null,
      total_vms: nodeDetails.reduce((sum, n) => sum + n.vms.length, 0),
      total_lxcs: nodeDetails.reduce((sum, n) => sum + n.lxcs.length, 0),
      running_vms: nodeDetails.reduce((sum, n) => sum + n.vms.filter(v => v.status === 'running').length, 0),
      running_lxcs: nodeDetails.reduce((sum, n) => sum + n.lxcs.filter(c => c.status === 'running').length, 0),
    };

    if (gpus && gpus.length > 0) {
      result.gpus = gpus;
    }

    return result;
  },

  historyKeys: ['cpu', 'ram_usage', 'running_vms', 'running_lxcs'],
};
