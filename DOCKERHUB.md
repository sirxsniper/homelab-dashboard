# Homelab Dashboard

A premium, self hosted dashboard for monitoring and managing your homelab services. Real time stats, beautiful dark UI, and full customisation.

## Quick Start

```bash
docker run -d \
  --name homelab-dashboard \
  -p 8080:80 \
  -v homelab-data:/app/backend/data \
  sirxsniper/homelab-dashboard:latest
```

Open `http://your-server-ip:8080` and log in with `admin` / `changeme`. Change your password immediately.

## Docker Compose

```yaml
services:
  homelab:
    image: sirxsniper/homelab-dashboard:latest
    container_name: homelab-dashboard
    ports:
      - "8080:80"
    volumes:
      - homelab-data:/app/backend/data
    environment:
      - INITIAL_ADMIN_USER=admin
      - INITIAL_ADMIN_PASS=changeme
    restart: unless-stopped

volumes:
  homelab-data:
```

## What It Does

Connects to 35+ homelab services and shows live stats on a single page. Everything updates in real time through Server Sent Events.

**Supported services:** Proxmox, Unraid, Linux (SSH), UniFi Network, Jellyfin, Plex, Tautulli, Sonarr, Radarr, Bazarr, Prowlarr, SABnzbd, qBittorrent, AdGuard Home, Pi-hole, Nginx Proxy Manager, Portainer, Uptime Kuma, Grafana, Immich, Nextcloud, Notifiarr, Vaultwarden, FreshRSS, MariaDB, Redis, Speedtest Tracker, iPerf3, SearXNG, Ollama, Open WebUI, Linkding, Overseerr/Jellyseerr, MeTube, phpMyAdmin, and more.

## Features

**Real time monitoring** with live CPU, RAM, temperature, and service status updates every few seconds.

**Full customisation** including dashboard name, logo, background image, all colours, card layout, and a weather widget. Everything stored locally in the browser.

**SearXNG integration** renders as a web search bar with live autocomplete instead of a regular card.

**Security** with JWT authentication, two factor auth (TOTP), role based access, encrypted credentials at rest, and rate limiting.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INITIAL_ADMIN_USER` | `admin` | Admin username (first run only) |
| `INITIAL_ADMIN_PASS` | `changeme` | Admin password (first run only) |
| `JWT_ACCESS_SECRET` | Auto generated | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Auto generated | Secret for refresh tokens |
| `CREDENTIAL_ENCRYPTION_KEY` | Auto generated | Key for encrypting credentials |

Secrets are auto generated on first startup and saved to the data volume.

## Updating

```bash
docker compose pull
docker compose up -d
```

Your data is stored in the volume and is preserved across updates.

## Links

GitHub: [https://github.com/sirxsniper/homelab-dashboard](https://github.com/sirxsniper/homelab-dashboard)

License: MIT
