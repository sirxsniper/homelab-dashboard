# Homelab Dashboard

A premium, self hosted dashboard for monitoring and managing your homelab services. Real time stats, beautiful dark UI, and full customisation.

![License](https://img.shields.io/badge/license-MIT-blue)
![Docker](https://img.shields.io/docker/pulls/sirxsniper/homelab-dashboard)

## What is this?

Homelab Dashboard gives you a single page where you can see everything running in your homelab at a glance. It connects to your services, pulls live data every few seconds, and displays it all in a clean, dark themed interface. You can monitor servers, media apps, download clients, network tools, databases, and more, all from one place.

Everything updates in real time through Server Sent Events (SSE). No need to refresh the page. When something goes down, you see it immediately.

## Features

**Real Time Monitoring**

The dashboard polls all your configured services on intervals you control (as fast as every 3 seconds for critical services). Stats are pushed to every open browser tab instantly through SSE. CPU usage, RAM, temperatures, container counts, download speeds, stream counts, and more are all live.

**30+ Supported Services**

Here is everything the dashboard can connect to out of the box:

| Category | Services |
|----------|----------|
| Servers | Proxmox VE, Unraid, Linux (via SSH) |
| Media | Jellyfin, Plex, Tautulli, Immich, MeTube |
| Downloads | SABnzbd, qBittorrent, Sonarr, Radarr, Bazarr, Prowlarr |
| Network | AdGuard Home, Pi hole, Nginx Proxy Manager, Vaultwarden |
| Monitoring | Uptime Kuma, Grafana, Speedtest Tracker, iPerf3 |
| Infrastructure | Portainer, MariaDB, Redis, phpMyAdmin |
| Automation | Notifiarr, Linkding |
| Other | Nextcloud, SearXNG, Ollama, Open WebUI, Overseerr/Jellyseerr |

Every service type has its own detailed card showing the most relevant data. Clicking a card opens a detailed modal with tabs, charts, and 24 hour history graphs.

**SearXNG Web Search**

If you add a SearXNG instance, it automatically appears as a search bar at the top of the dashboard instead of a regular card. Type your query, get live autocomplete suggestions, and press enter to open results in a new tab on your SearXNG instance.

**Weather Widget**

An optional weather widget can be enabled through the Customise settings. It sits next to the search bar and shows current temperature, conditions with animated weather icons, humidity, and wind speed. You just need a free API key from OpenWeatherMap and your city name.

**Full Customisation**

Everything about the look and feel can be changed from the settings panel:

| Setting | What it does |
|---------|-------------|
| Dashboard name and logo | Replaces the default "Homelab" text and icon in the top bar |
| Background image | Upload any image, it gets auto compressed to fit browser storage limits (up to 20MB input) |
| Colours | Every surface, text, accent, status, and graph colour can be changed individually |
| Section layout | Each section (Servers, Media, Network, etc.) can have 1 to 5 cards per row |
| Card radius | Adjust the corner rounding on all cards |
| Weather | Configure API key, location, and temperature units (Celsius or Fahrenheit) |

All customisation is stored locally in your browser. Different users on different devices can have their own themes.

**Security**

The dashboard uses JWT authentication with short lived access tokens and long lived refresh tokens. Passwords are hashed with bcrypt. Two factor authentication (TOTP) is supported. All service credentials (API keys, passwords, SSH keys) are encrypted at rest in the database using AES 256. Admin and viewer roles control who can modify settings.

## Screenshots

*Coming soon*

## Getting Started with Docker

This is the easiest way to get the dashboard running. One command and you are done.

```bash
docker run -d \
  --name homelab-dashboard \
  -p 8080:80 \
  -v homelab-data:/app/backend/data \
  sirxsniper/homelab-dashboard:latest
```

Open your browser and go to `http://your-server-ip:8080`. Log in with the default credentials:

| | |
|---|---|
| **Username** | admin |
| **Password** | changeme |

**Change your password immediately after logging in.** Go to Settings (gear icon) and update it in the Users tab.

### Using Docker Compose

Create a file called `docker-compose.yml`:

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

Then start it:

```bash
docker compose up -d
```

To check logs:

```bash
docker logs homelab-dashboard
```

To update to the latest version:

```bash
docker compose pull
docker compose up -d
```

Your data is stored in the `homelab-data` volume, so updates are safe and nothing gets lost.

### Changing the Port

If you want to use a different port, for example 3344, just change the left side of the port mapping:

```yaml
ports:
  - "3344:80"
```

### Using it with Portainer

If you manage your containers through Portainer, go to Stacks, click Add Stack, paste the docker compose content from above, and deploy. You can change the port and credentials from the environment variables section before deploying.

### Environment Variables

| Variable | Default | What it does |
|----------|---------|-------------|
| `INITIAL_ADMIN_USER` | `admin` | The admin username created on first startup only |
| `INITIAL_ADMIN_PASS` | `changeme` | The admin password created on first startup only |
| `JWT_ACCESS_SECRET` | Auto generated | Secret key used to sign access tokens |
| `JWT_REFRESH_SECRET` | Auto generated | Secret key used to sign refresh tokens |
| `CREDENTIAL_ENCRYPTION_KEY` | Auto generated | Key used to encrypt stored service credentials |
| `JWT_ACCESS_EXPIRY` | `15m` | How long access tokens are valid |
| `JWT_REFRESH_EXPIRY` | `7d` | How long refresh tokens are valid |

The three secret keys are auto generated on first startup if you do not provide them. They are saved to the data volume so they survive container restarts. For production use, you can generate your own with:

```bash
openssl rand -hex 32
```

Run that command three times and use each output for one of the secret variables.

## Manual Installation (Without Docker)

If you prefer to run it directly on a server or VM, follow these steps.

### What You Need

| Requirement | Notes |
|-------------|-------|
| Node.js 18+ | The backend runs on Node. Version 18 or newer is required. |
| Nginx | Used as a reverse proxy to serve the frontend and forward API requests. |
| PM2 | Recommended process manager to keep the backend running. Optional but highly recommended. |
| Git | To clone the repository. |
| iperf3 | Only needed if you want to use the iPerf3 speed test integration. |

### Step 1: Clone the Repository

```bash
git clone https://github.com/sirxsniper/homelab-dashboard.git
cd homelab-dashboard
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This will compile the `better-sqlite3` native module, which requires `python3`, `make`, and `g++` on your system. On Debian/Ubuntu:

```bash
apt install python3 make g++
```

### Step 3: Configure the Environment

```bash
cp .env.example .env
nano .env
```

Generate three random secrets and paste them into the `.env` file:

```bash
openssl rand -hex 32
```

Your `.env` file should look something like this:

```env
PORT=3001
DB_PATH=./data/homelab.db
JWT_ACCESS_SECRET=your_first_random_string_here
JWT_REFRESH_SECRET=your_second_random_string_here
CREDENTIAL_ENCRYPTION_KEY=your_third_random_string_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
INITIAL_ADMIN_USER=admin
INITIAL_ADMIN_PASS=changeme
```

### Step 4: Build the Frontend

```bash
cd ../frontend
npm install
npm run build
```

This creates a `dist` folder with the compiled static files that Nginx will serve.

### Step 5: Set Up Nginx

Create a new Nginx site configuration:

```bash
nano /etc/nginx/sites-available/homelab
```

Paste the following, replacing `/path/to/homelab-dashboard` with the actual path where you cloned the repo:

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

The `/api/stream` block is important because it disables buffering for the SSE connection. Without it, real time updates will not work correctly.

Enable the site and reload Nginx:

```bash
ln -s /etc/nginx/sites-available/homelab /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

If `nginx -t` shows any errors, double check the file path in the `root` directive.

### Step 6: Start the Backend

Using PM2 (recommended):

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

The `pm2 startup` command will give you a command to run that makes PM2 start automatically on boot. Copy and run it.

If you do not want to use PM2, you can start it directly:

```bash
cd backend
npm start
```

But keep in mind that it will stop when you close the terminal unless you set up a systemd service or similar.

### Step 7: Open the Dashboard

Go to `http://your-server-ip` in your browser. Log in with the credentials you set in the `.env` file. If you left them as default, use `admin` / `changeme`.

## Adding Your Services

Once you are logged in:

1. Click the gear icon in the top right corner
2. Go to the **Apps** tab
3. Click **Add App**
4. Pick the service type from the dropdown
5. Fill in the URL and any required credentials
6. Click Save

The dashboard will start polling the service immediately and the card will appear on your dashboard.

### What Credentials Does Each Service Need?

| Service | What You Need |
|---------|--------------|
| Proxmox VE | URL + API token (PVEAPIToken=user@realm!tokenid=secret) |
| Unraid, Linux | SSH host + username + password or SSH key |
| Jellyfin, Sonarr, Radarr, Bazarr, Prowlarr | URL + API key (found in each app's settings) |
| Plex | URL + X-Plex-Token |
| Tautulli | URL + API key |
| AdGuard Home | URL + username + password |
| Pi hole | URL + API key (found in Pi hole settings) |
| Uptime Kuma | URL + API key or username + password |
| Grafana | URL + API token |
| Portainer | URL + username + password or API key |
| SABnzbd, qBittorrent | URL + API key or username + password |
| Nginx Proxy Manager | URL + email + password |
| Nextcloud | URL + username + app password |
| Notifiarr | URL + API key |
| Immich | URL + API key |
| Overseerr/Jellyseerr | URL + API key |
| Ollama, Open WebUI | URL only |
| Vaultwarden | URL + admin token |
| MariaDB | Host + username + password |
| Redis | Host + optional password |
| Speedtest Tracker | URL + API key or none |
| SearXNG | URL only |
| Linkding | URL + API token |
| iPerf3 | Target host + port |

All credentials are encrypted with AES 256 before being stored in the database. They are only decrypted in memory when polling the service.

### The Open URL Field

When adding an app, there is an optional "Open URL" field. This is the URL that opens when you click the "Open" button on a card. This is useful when the internal URL you use for polling is different from the URL you access in your browser (for example, an internal IP vs a public domain).

## iPerf3 Speed Tests

The iPerf3 integration runs actual network speed tests between the dashboard server and a remote iPerf3 server. This requires the `iperf3` binary installed on the machine running the dashboard backend:

```bash
# Debian/Ubuntu
apt install iperf3

# Alpine (the Docker image already includes this)
apk add iperf3
```

The remote machine also needs to be running `iperf3 -s` (server mode) for the test to work.

## Architecture

```
Browser
  |
  |  Static files (React app)
  v
Nginx
  |
  |  /api/* requests proxied to backend
  v
Node.js Backend (Express)
  |
  |  Polls services on configurable intervals
  |  Pushes live updates via SSE every 3 seconds
  |  Stores stats history for 24 hour charts
  v
SQLite Database
  |
  |  Apps, users, encrypted credentials, stats, history
```

The frontend is built with React 19, Vite, and Tailwind CSS v4. Charts use Recharts. Data fetching uses React Query as a fallback, with SSE as the primary data source.

The backend is built with Express 5 and uses better-sqlite3 for the database. Service polling happens through connector modules, one per service type. Each connector knows how to talk to its service's API and returns normalized data.

## Updating

**Docker:**

```bash
docker compose pull
docker compose up -d
```

**Manual:**

```bash
cd homelab-dashboard
git pull
cd frontend && npm install && npm run build
cd ../backend && npm install
pm2 restart homelab-api
```

## Backup

The only thing you need to back up is the SQLite database file:

**Docker:** The database lives inside the `homelab-data` volume at `/app/backend/data/homelab.db`

**Manual:** The database is at `backend/data/homelab.db` inside the project folder

## Contributing

Contributions are welcome. Open an issue to report bugs or suggest features. Pull requests are appreciated.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
