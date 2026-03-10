# Homelab Dashboard

A premium, self hosted dashboard for monitoring and managing your homelab services. Real time stats, beautiful dark UI, and full customisation.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

**Real Time Monitoring**
* Live service status with Server Sent Events (SSE), updates every 3 seconds
* CPU, RAM, temperature, and Docker container monitoring for bare metal servers
* Health ring and status indicators in the topbar

**30+ Supported Services**
* **Servers**: Proxmox VE, Unraid, Linux (via SSH)
* **Media**: Jellyfin, Plex, Tautulli, Immich, MeTube
* **Downloads**: SABnzbd, qBittorrent, Sonarr, Radarr, Bazarr, Prowlarr
* **Network & Security**: AdGuard Home, Pi-hole, Nginx Proxy Manager, Vaultwarden, WireGuard
* **Monitoring**: Uptime Kuma, Grafana, Speedtest Tracker, iPerf3
* **Infrastructure**: Portainer, MariaDB, Redis, phpMyAdmin
* **Automation**: Notifiarr, Linkding
* **Other**: Nextcloud, Searxng, Ollama, Open WebUI, Overseerr/Jellyseerr

**Full Customisation**
* Dashboard name and logo upload
* Background image support (auto compressed for storage)
* All colours customisable: surfaces, text, accents, status indicators, graphs
* Per section column layout (1 to 5 cards per row)
* Card border radius control
* Everything stored locally in the browser

**Security**
* JWT authentication with access and refresh tokens
* Two factor authentication (TOTP) support
* Role based access control (admin/viewer)
* Rate limiting on auth endpoints
* All app credentials encrypted at rest
* Helmet security headers

## Screenshots

*Coming soon*

## Quick Start with Docker

The fastest way to get started:

```bash
docker run -d \
  --name homelab-dashboard \
  -p 8080:80 \
  -v homelab-data:/app/backend/data \
  sirxsniper/homelab-dashboard:latest
```

Then open `http://your-server-ip:8080` and log in with:
* **Username**: `admin`
* **Password**: `changeme`

**Change your password immediately after first login.**

### Docker Compose

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

```bash
docker compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INITIAL_ADMIN_USER` | `admin` | Admin username (first run only) |
| `INITIAL_ADMIN_PASS` | `changeme` | Admin password (first run only) |
| `JWT_ACCESS_SECRET` | Auto generated | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Auto generated | Secret for refresh tokens |
| `CREDENTIAL_ENCRYPTION_KEY` | Auto generated | Key for encrypting stored credentials |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |

> Secrets are auto generated on first start if not provided. For production, set your own using `openssl rand -hex 32`.

## Manual Installation

### Requirements

* Node.js 18 or later
* Nginx (or any reverse proxy)
* PM2 (recommended) or any process manager

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/sirxsniper/homelab-dashboard.git
cd homelab-dashboard
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Configure environment**

```bash
cp .env.example .env
```

Edit `.env` and set your secrets:

```bash
# Generate secrets
openssl rand -hex 32  # Run this 3 times, one for each secret
```

**4. Build the frontend**

```bash
cd ../frontend
npm install
npm run build
```

**5. Configure Nginx**

Create `/etc/nginx/sites-available/homelab`:

```nginx
server {
    listen 80;
    server_name _;

    root /path/to/homelab-dashboard/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/stream {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/homelab /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

**6. Start the backend**

Using PM2 (recommended):

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Or directly:

```bash
cd backend
npm start
```

**7. Open the dashboard**

Navigate to `http://your-server-ip` and log in with the credentials from your `.env` file.

## Adding Services

1. Log in as admin
2. Click the gear icon in the topbar
3. Go to the **Apps** tab
4. Click **Add App**
5. Select the service type, enter the connection details, and save

Each service type requires different credentials:

| Service | Auth Required |
|---------|--------------|
| Proxmox, Unraid, Linux | SSH (key or password) |
| Jellyfin, Sonarr, Radarr, etc. | API Key |
| AdGuard Home, Pi-hole | Username + Password |
| Uptime Kuma, Grafana | API Key or Token |
| Overseerr/Jellyseerr | API Key |

All credentials are encrypted before being stored in the database.

## Architecture

```
Frontend (React + Vite + Tailwind v4)
    |
    |  Static files served by Nginx
    |
Nginx (reverse proxy)
    |
    |  /api/* proxied to backend
    |
Backend (Express + SQLite)
    |
    |  Polls services on configurable intervals
    |  Pushes updates via SSE every 3 seconds
    |
SQLite Database
    |
    |  Apps, users, credentials (encrypted), stats
```

* **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, React Query
* **Backend**: Express 5, better-sqlite3, node-cron, SSH2, Axios
* **Auth**: JWT (access + refresh tokens), bcrypt password hashing, TOTP 2FA
* **Real Time**: Server Sent Events with automatic reconnection

## iPerf3 Speed Tests

The iPerf3 integration runs actual network speed tests between the dashboard server and your iPerf3 instance. This requires the `iperf3` binary installed on the machine running the dashboard:

```bash
# Debian/Ubuntu
apt install iperf3

# Alpine (Docker image includes this)
apk add iperf3
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
