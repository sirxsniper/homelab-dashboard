const cron = require('node-cron');
const { getDb } = require('./db');
const { decrypt } = require('./crypto');
const connectors = require('../connectors');
const { pushNow } = require('../routes/stream');
const historyStore = require('./historyStore');

const activeJobs = new Map();

// Cache previous state for change detection
const prevState = new Map();

// Keys to compare for instant push (state changes that matter)
const CHANGE_DETECT_KEYS = {
  proxmox: ['running_vms', 'running_lxcs', 'total_vms', 'total_lxcs'],
  jellyfin: ['active_streams'],
  plex: ['active_streams'],
  unraid: ['docker_running', 'docker_total'],
  tautulli: ['active_streams'],
  sonarr: ['queue_count', 'missing'],
  radarr: ['queue_count', 'missing'],
  sabnzbd: ['queue_count'],
  qbittorrent: ['active'],
  portainer: ['running', 'stopped'],
  linux: ['docker_running', 'docker_total'],
};

function detectStateChange(appType, appId, newStats) {
  const keys = CHANGE_DETECT_KEYS[appType];
  if (!keys) return false;

  const prev = prevState.get(appId);
  if (!prev) {
    prevState.set(appId, newStats);
    return false;
  }

  let changed = false;
  for (const key of keys) {
    if (prev[key] !== newStats[key]) {
      changed = true;
      break;
    }
  }

  // Also detect VM/LXC/stream list changes for proxmox/jellyfin
  if (!changed && appType === 'proxmox' && newStats.nodes) {
    const prevGuests = prev.nodes?.flatMap(n => [...(n.vms || []), ...(n.lxcs || [])].map(g => `${g.vmid}:${g.status}`)).sort().join(',');
    const newGuests = newStats.nodes?.flatMap(n => [...(n.vms || []), ...(n.lxcs || [])].map(g => `${g.vmid}:${g.status}`)).sort().join(',');
    if (prevGuests !== newGuests) changed = true;
  }
  if (!changed && (appType === 'jellyfin' || appType === 'plex') && newStats.streams) {
    const prevStreams = JSON.stringify(prev.streams || []);
    const newStreams = JSON.stringify(newStats.streams || []);
    if (prevStreams !== newStreams) changed = true;
  }

  prevState.set(appId, newStats);
  return changed;
}

function startPolling() {
  const db = getDb();
  const apps = db.prepare('SELECT * FROM apps WHERE enabled = 1').all();

  for (const app of apps) {
    scheduleApp(app);
  }

  // Cleanup old history entries every hour
  cron.schedule('0 * * * *', () => {
    const cutoff = Math.floor(Date.now() / 1000) - 86400; // 24h ago
    db.prepare('DELETE FROM stats_history WHERE recorded_at < ?').run(cutoff);
  });

  console.log(`[Poller] Started polling for ${apps.length} apps`);
}

function scheduleApp(app) {
  // Stop existing job if any
  stopApp(app.id);

  const connector = connectors.get(app.type);
  // Use connector's defaultInterval, fall back to app's poll_interval, then 30s
  const intervalSec = connector?.defaultInterval || app.poll_interval || 30;
  const cronExpr = intervalSec < 60
    ? `*/${intervalSec} * * * * *`  // every N seconds
    : `*/${Math.floor(intervalSec / 60)} * * * *`; // every N minutes

  const job = cron.schedule(cronExpr, () => pollApp(app));
  activeJobs.set(app.id, job);

  // Run immediately on schedule
  pollApp(app);

  console.log(`[Poller] Scheduled ${app.name} (${app.type}) every ${intervalSec}s`);
}

function stopApp(appId) {
  const job = activeJobs.get(appId);
  if (job) {
    job.stop();
    activeJobs.delete(appId);
  }
}

function stopAll() {
  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
}

async function pollApp(app) {
  const db = getDb();
  const connector = connectors.get(app.type);
  if (!connector) {
    console.error(`[Poller] No connector for type: ${app.type}`);
    return;
  }

  try {
    let credential = null;
    if (app.credential) {
      try {
        credential = JSON.parse(decrypt(app.credential));
      } catch (e) {
        console.error(`[Poller] Failed to decrypt credentials for ${app.name}`);
        return;
      }
    }

    const stats = await connector.fetch(app, credential);
    const now = Math.floor(Date.now() / 1000);
    const data = JSON.stringify(stats);

    // Upsert latest stats
    db.prepare(`
      INSERT INTO stats_latest (app_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(app_id) DO UPDATE SET data = ?, updated_at = ?
    `).run(app.id, data, now, data, now);

    // Append to history (store only key metrics)
    let historyData = stats;
    if (connector.historyKeys) {
      historyData = {};
      for (const key of connector.historyKeys) {
        const parts = key.split('.');
        let val = stats;
        for (const p of parts) {
          val = val?.[p];
        }
        historyData[key] = val;
      }
    }
    db.prepare(
      'INSERT INTO stats_history (app_id, data, recorded_at) VALUES (?, ?, ?)'
    ).run(app.id, JSON.stringify(historyData), now);

    // Push to sparkline history for server-type apps
    if (app.type === 'proxmox') {
      historyStore.push(`${app.id}_cpu`, stats.cpu);
      if (stats.ram?.used != null && stats.ram?.total) {
        historyStore.push(`${app.id}_ram`, (stats.ram.used / stats.ram.total) * 100);
      }
    } else if (app.type === 'unraid' || app.type === 'linux') {
      historyStore.push(`${app.id}_cpu`, stats.cpu_usage);
      historyStore.push(`${app.id}_ram`, stats.ram_usage);
    }

    // Detect state changes and push instantly if needed
    const changed = detectStateChange(app.type, app.id, stats);
    if (changed) {
      try { pushNow(); } catch {}
    }

  } catch (err) {
    console.error(`[Poller] Error polling ${app.name}: ${err.message}`);

    // Store error state
    const now = Math.floor(Date.now() / 1000);
    const errorData = JSON.stringify({ error: err.message, status: 'degraded' });
    db.prepare(`
      INSERT INTO stats_latest (app_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(app_id) DO UPDATE SET data = ?, updated_at = ?
    `).run(app.id, errorData, now, errorData, now);
  }
}

function refreshApp(appId) {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
  if (app && app.enabled) {
    scheduleApp(app);
  } else {
    stopApp(appId);
  }
}

module.exports = { startPolling, scheduleApp, stopApp, stopAll, refreshApp, pollApp };
