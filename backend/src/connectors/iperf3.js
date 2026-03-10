const { execFile } = require('child_process');
const net = require('net');

// Cache last test result so we don't hammer the server every poll
const resultCache = {};

function runIperf(host, port, args = [], timeout = 20000) {
  return new Promise((resolve, reject) => {
    const cmdArgs = ['-c', host, '-p', String(port), '-J', '-t', '5', ...args];
    const child = execFile('iperf3', cmdArgs, { timeout }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); }
      catch { reject(new Error('Invalid iperf3 JSON output')); }
    });
  });
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
      socket.destroy();
      resolve({ online: true, responseTime: Date.now() - start });
    });
    socket.on('error', () => { socket.destroy(); resolve({ online: false, responseTime: Date.now() - start }); });
    socket.on('timeout', () => { socket.destroy(); resolve({ online: false, responseTime: Date.now() - start }); });
  });
}

module.exports = {
  type: 'iperf3',
  defaultInterval: 300,  // 5 min — speed tests are heavy

  async fetch(app, credential) {
    const host = (credential?.host || app.url || '')
      .replace(/^https?:\/\//, '')
      .replace(/[:/].*$/, '');
    const port = parseInt(credential?.port) || 5201;

    // Quick port check first
    const portCheck = await checkPort(host, port);
    if (!portCheck.online) {
      return { status: 'offline', response_time: portCheck.responseTime, port };
    }

    // Use cached result if fresh enough (within defaultInterval)
    const cacheKey = `${host}:${port}`;
    const cached = resultCache[cacheKey];
    if (cached && Date.now() - cached.time < 280000) {
      return { ...cached.data, response_time: portCheck.responseTime };
    }

    // Run upload test (normal)
    let upload = null;
    try {
      const upResult = await runIperf(host, port, [], 25000);
      const upEnd = upResult.end;
      upload = {
        bps: upEnd.sum_sent.bits_per_second,
        retransmits: upEnd.sum_sent.retransmits || 0,
      };
    } catch {
      // iperf3 might be busy — return cached or basic status
      if (cached) return { ...cached.data, response_time: portCheck.responseTime };
      return { status: 'online', response_time: portCheck.responseTime, port, busy: true };
    }

    // Run download test (reverse)
    let download = null;
    try {
      const downResult = await runIperf(host, port, ['-R'], 25000);
      const downEnd = downResult.end;
      download = {
        bps: downEnd.sum_received.bits_per_second,
      };
    } catch {
      // Reverse might fail on some setups
    }

    const uploadMbps = upload ? parseFloat((upload.bps / 1e6).toFixed(1)) : null;
    const downloadMbps = download ? parseFloat((download.bps / 1e6).toFixed(1)) : null;
    const uploadGbps = upload ? parseFloat((upload.bps / 1e9).toFixed(2)) : null;
    const downloadGbps = download ? parseFloat((download.bps / 1e9).toFixed(2)) : null;

    const result = {
      status: 'online',
      response_time: portCheck.responseTime,
      port,
      upload_mbps: uploadMbps,
      download_mbps: downloadMbps,
      upload_gbps: uploadGbps,
      download_gbps: downloadGbps,
      retransmits: upload?.retransmits || 0,
      tested_at: new Date().toISOString(),
    };

    resultCache[cacheKey] = { data: result, time: Date.now() };
    return result;
  },

  historyKeys: ['upload_mbps', 'download_mbps'],
};
