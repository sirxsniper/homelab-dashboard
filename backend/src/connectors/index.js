const connectorMap = new Map();

// Register all connectors
const types = [
  'generic', 'proxmox', 'unraid', 'jellyfin', 'plex', 'adguard',
  'pihole', 'uptime_kuma', 'vaultwarden', 'nginx_proxy',
  'portainer', 'grafana',
  'sonarr', 'radarr', 'bazarr', 'prowlarr', 'sabnzbd',
  'qbittorrent', 'metube', 'tautulli', 'immich', 'nextcloud',
  'searxng', 'ollama', 'open_webui', 'linkding', 'notifiarr',
  'speedtest_tracker', 'iperf3', 'mariadb', 'redis', 'phpmyadmin', 'linux', 'seerr',
];

for (const type of types) {
  const connector = require(`./${type}`);
  connectorMap.set(connector.type, connector);
}

module.exports = {
  get(type) {
    return connectorMap.get(type) || connectorMap.get('generic');
  },
  list() {
    return Array.from(connectorMap.values()).map(c => ({
      type: c.type,
      defaultInterval: c.defaultInterval,
    }));
  },
};
