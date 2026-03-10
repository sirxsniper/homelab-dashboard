const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

function sshExec(host, user, authOpts, cmd, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); reject(new Error('SSH timeout')); }, timeout);

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return; }
        let out = '';
        stream.on('data', (d) => { out += d; });
        stream.stderr.on('data', () => {});
        stream.on('close', () => {
          clearTimeout(timer);
          conn.end();
          resolve(out);
        });
      });
    });

    conn.on('error', (err) => { clearTimeout(timer); reject(err); });

    const connOpts = { host, port: 22, username: user, readyTimeout: 5000 };
    if (authOpts.privateKey) connOpts.privateKey = authOpts.privateKey;
    if (authOpts.password) connOpts.password = authOpts.password;
    conn.connect(connOpts);
  });
}

// Track previous network bytes per app for rate calculation
const prevNetMap = {};

module.exports = {
  type: 'linux',
  defaultInterval: 5,

  async fetch(app, credential) {
    const host = (credential?.ssh_host || app.url)
      .replace(/^(https?|ssh):\/\//, '')
      .replace(/[:/].*$/, '');
    const user = credential?.ssh_user || credential?.username || 'root';
    const pass = credential?.ssh_password || credential?.password;

    // Try SSH key first, fall back to password
    let privateKey = null;
    const keyPath = path.join(process.env.HOME || '/root', '.ssh', 'id_ed25519');
    try { privateKey = fs.readFileSync(keyPath); } catch {}

    if (!privateKey && !pass) {
      throw new Error('SSH requires a key (~/.ssh/id_ed25519) or password');
    }

    const authOpts = {};
    if (privateKey) authOpts.privateKey = privateKey;
    if (pass) authOpts.password = pass;

    const cmd = `
echo "===HOSTNAME==="
hostname
echo "===CPU_CORES==="
nproc
echo "===CPU_MODEL==="
grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2
echo "===CPU_USAGE==="
awk '{u=$2+$4; t=$2+$4+$5; if(NR==1){su=u;st=t} else {printf "%.1f", (u-su)*100/(t-st)}}' <(head -1 /proc/stat) <(sleep 0.5 && head -1 /proc/stat)
echo ""
echo "===CPU_FREQ==="
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null || echo 0
echo "===CPU_TEMP==="
cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0
echo "===MEMORY==="
free -b | grep Mem
echo "===DISK==="
df -B1 / | tail -1
echo "===UPTIME==="
cat /proc/uptime
echo "===NETWORK==="
cat /proc/net/dev | grep -vE 'lo:|Inter|face' | head -1
echo "===GPU==="
nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv,noheader,nounits 2>/dev/null || echo "NONE"
echo "===GPU_SYSFS==="
for card in /sys/class/drm/card[0-9]; do
  cn=$(basename $card)
  vendor=$(cat $card/device/vendor 2>/dev/null)
  pcipath=$(basename $(readlink $card/device) 2>/dev/null)
  devname=$(lspci -s $pcipath 2>/dev/null | sed 's/^[^ ]* //')
  hw=$(ls -d $card/device/hwmon/hwmon* 2>/dev/null | head -1)
  temp=$(cat $hw/temp1_input 2>/dev/null || echo 0)
  freq_cur=$(cat $card/gt_cur_freq_mhz 2>/dev/null || echo 0)
  vram_total=$(cat $card/device/mem_info_vram_total 2>/dev/null || echo 0)
  vram_used=$(cat $card/device/mem_info_vram_used 2>/dev/null || echo 0)
  echo "GPU_SYSFS|$cn|$vendor|$devname|$temp|$freq_cur|$vram_total|$vram_used"
done 2>/dev/null
echo "===DOCKER==="
docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}' 2>/dev/null
echo "===DOCKER_STATUS==="
docker ps -a --format '{{.Names}}|{{.State}}|{{.Status}}' 2>/dev/null
echo "===OS==="
cat /etc/os-release 2>/dev/null | grep PRETTY_NAME
echo "===MODEL==="
cat /proc/device-tree/model 2>/dev/null || dmidecode -s system-product-name 2>/dev/null
echo ""
`;

    const raw = await sshExec(host, user, authOpts, cmd, 12000);
    const section = (tag) => {
      const re = new RegExp(`===${tag}===\\n([\\s\\S]*?)(?=\\n===|$)`);
      const m = raw.match(re);
      return m ? m[1].trim() : '';
    };

    // Hostname
    const hostname = section('HOSTNAME') || host;

    // CPU
    const cpuCores = parseInt(section('CPU_CORES')) || 0;
    const cpuModel = section('CPU_MODEL').trim() || null;
    const cpuUsage = parseFloat(section('CPU_USAGE')) || 0;
    const cpuFreqKhz = parseInt(section('CPU_FREQ')) || 0;
    const cpuFreqMhz = Math.round(cpuFreqKhz / 1000);
    const cpuTempRaw = parseInt(section('CPU_TEMP')) || 0;
    const cpuTemp = cpuTempRaw > 1000 ? Math.round(cpuTempRaw / 1000) : cpuTempRaw;

    // Memory
    const memLine = section('MEMORY');
    const memParts = memLine.split(/\s+/);
    const ramTotalB = parseInt(memParts[1]) || 0;
    const ramUsedB = parseInt(memParts[2]) || 0;
    const ramTotalGb = parseFloat((ramTotalB / (1024 ** 3)).toFixed(1));
    const ramUsedGb = parseFloat((ramUsedB / (1024 ** 3)).toFixed(1));
    const ramUsage = ramTotalB > 0 ? parseFloat(((ramUsedB / ramTotalB) * 100).toFixed(1)) : 0;

    // Disk
    const diskLine = section('DISK');
    const diskParts = diskLine.split(/\s+/);
    const diskTotalB = parseInt(diskParts[1]) || 0;
    const diskUsedB = parseInt(diskParts[2]) || 0;
    const diskTotalGb = parseFloat((diskTotalB / (1024 ** 3)).toFixed(1));
    const diskUsedGb = parseFloat((diskUsedB / (1024 ** 3)).toFixed(1));
    const diskUsage = diskTotalB > 0 ? parseFloat(((diskUsedB / diskTotalB) * 100).toFixed(1)) : 0;

    // Uptime
    const uptimeSec = parseFloat(section('UPTIME').split(' ')[0]) || 0;
    const uptimeDays = Math.floor(uptimeSec / 86400);

    // Network (per-app tracking for rate calculation)
    const netLine = section('NETWORK');
    const netMatch = netLine.match(/\S+:\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
    const rxBytes = netMatch ? parseInt(netMatch[1]) : 0;
    const txBytes = netMatch ? parseInt(netMatch[2]) : 0;
    const now = Date.now();
    const prev = prevNetMap[app.id];

    let netRxRate = 0, netTxRate = 0;
    if (prev) {
      const dt = (now - prev.time) / 1000;
      if (dt > 0 && dt < 30) {
        netRxRate = parseFloat(((rxBytes - prev.rx) / dt / 1024 / 1024).toFixed(2));
        netTxRate = parseFloat(((txBytes - prev.tx) / dt / 1024 / 1024).toFixed(2));
        if (netRxRate < 0) netRxRate = 0;
        if (netTxRate < 0) netTxRate = 0;
      }
    }
    prevNetMap[app.id] = { rx: rxBytes, tx: txBytes, time: now };

    // GPU — try NVIDIA first, then sysfs (Intel/AMD)
    let gpu = null;
    const gpuRaw = section('GPU');
    if (gpuRaw && gpuRaw !== 'NONE') {
      const parts = gpuRaw.split(',').map(s => s.trim());
      gpu = {
        name: parts[0] || 'NVIDIA GPU',
        type: 'nvidia',
        usage: parseFloat(parts[1]) || 0,
        vram_used_mb: parseFloat(parts[2]) || 0,
        vram_total_mb: parseFloat(parts[3]) || 0,
        temp: parseFloat(parts[4]) || 0,
        power_draw: parseFloat(parts[5]) || 0,
      };
    }

    // Fallback: sysfs GPU (Intel/AMD)
    if (!gpu) {
      const sysfsLines = section('GPU_SYSFS').split('\n').filter(l => l.startsWith('GPU_SYSFS|'));
      for (const line of sysfsLines) {
        const p = line.split('|');
        const vendor = p[2];
        const tempMilli = parseInt(p[4]) || 0;
        const freqMhz = parseInt(p[5]) || 0;
        if (tempMilli === 0 && freqMhz === 0) continue;

        let gpuType = 'unknown';
        if (vendor === '0x8086') gpuType = 'intel';
        else if (vendor === '0x1002') gpuType = 'amd';

        // Extract name from lspci output brackets
        let name = (p[3] || '').trim();
        const brackets = [...name.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
        if (brackets.length > 0) name = brackets[brackets.length - 1];

        gpu = {
          name: name || `${gpuType.toUpperCase()} GPU`,
          type: gpuType,
          usage: null,
          vram_used_mb: (parseInt(p[7]) || 0) > 0 ? Math.round(parseInt(p[7]) / 1024 / 1024) : null,
          vram_total_mb: (parseInt(p[6]) || 0) > 0 ? Math.round(parseInt(p[6]) / 1024 / 1024) : null,
          temp: tempMilli > 1000 ? Math.round(tempMilli / 1000) : tempMilli,
          freq_mhz: freqMhz,
          power_draw: null,
        };
        break; // Use first real GPU found
      }
    }

    // Docker containers
    const dockerStats = section('DOCKER').split('\n').filter(Boolean).map(line => {
      const [name, cpuPct, memUsage, memPct] = line.split('|');
      return { name: name || '', cpu: parseFloat(cpuPct) || 0, mem: memUsage || '', mem_pct: parseFloat(memPct) || 0 };
    });

    const dockerStatus = section('DOCKER_STATUS').split('\n').filter(Boolean).map(line => {
      const [name, state, status] = line.split('|');
      return { name, state, status };
    });

    const containers = dockerStatus.map(ds => {
      const stat = dockerStats.find(s => s.name === ds.name);
      return {
        name: ds.name, state: ds.state, status: ds.status,
        cpu: stat?.cpu || 0, mem: stat?.mem || '', mem_pct: stat?.mem_pct || 0,
      };
    });

    const dockerRunning = containers.filter(c => c.state === 'running').length;
    const dockerTotal = containers.length;

    // OS / Model
    const osMatch = section('OS').match(/PRETTY_NAME="?([^"]+)"?/);
    const os = osMatch ? osMatch[1] : 'Linux';
    const model = section('MODEL').replace(/\0/g, '').trim() || null;

    const result = {
      status: 'online',
      hostname,
      model,
      os,
      cpu_model: cpuModel,
      cpu_cores: cpuCores,
      cpu_usage: cpuUsage,
      cpu_freq_mhz: cpuFreqMhz,
      cpu_temp: cpuTemp,
      ram_total_gb: ramTotalGb,
      ram_used_gb: ramUsedGb,
      ram_usage: ramUsage,
      disk_total_gb: diskTotalGb,
      disk_used_gb: diskUsedGb,
      disk_usage: diskUsage,
      uptime_days: uptimeDays,
      net_rx_mbps: netRxRate,
      net_tx_mbps: netTxRate,
      docker_running: dockerRunning,
      docker_total: dockerTotal,
      containers,
    };

    if (gpu) result.gpu = gpu;

    return result;
  },

  historyKeys: ['cpu_usage', 'ram_usage', 'cpu_temp', 'docker_running'],
};
