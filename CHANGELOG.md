# Changelog

## v1.1.0

### New Features
- **SearXNG Search Bar**: SearXNG apps now render as a full width web search bar above the dashboard toolbar with live autocomplete suggestions. Results open in a new tab.
- **Weather Widget**: Optional weather display next to the search bar. Configurable via the Customise tab (requires a free OpenWeatherMap API key). Supports animated weather icons for all conditions (sun, rain, snow, clouds, thunder, mist) with Celsius and Fahrenheit units.
- **Live Clock**: The top bar now features a live clock with date, replacing the old status summary.
- **Universal Open Button**: All apps with an Open URL configured now show a consistent "Open" button on their cards.
- **Open WebUI**: Rich connector with models, users, chats, knowledge, prompts and tools stats. Card shows 6 key metrics, modal has 3 tabs (Overview, Models, Recent Chats). Authenticates via username/password.
- **Custom Dashboard Sections**: Create, reorder (drag & drop), and configure dashboard sections from the Customise tab. Sections can filter by category or app type.
- **Dynamic Categories**: Custom section names automatically become available as app categories in the edit form and filter bar.
- **Credential Persistence**: Editing an app now shows saved credentials with eye toggle for visibility.
- **Changelog Viewer**: Click the version number in the footer to view the full changelog.

### Improvements
- **Nextcloud**: Enriched connector now fetches total users, federated shares, app update counts, CPU load averages (1m/5m/15m), memory and swap usage with totals, PHP version and limits, web server and database info. Card shows users, apps, and memory breakdown. Modal has two tabs: Overview and System.
- **Portainer**: Enriched connector now fetches Docker version, image total size, networks, container uptime, ports, and stack details. Card shows container status text. Modal has three tabs: Overview, Containers, and Stacks.
- **Notifiarr**: Rewrote connector to fetch real data from `/api/version` and `/api/services/list`. Card shows integrations, service health checks with status pills, uptime, and version. Modal has three tabs: Overview, Service Checks, and Integrations.
- **Jellyfin & Plex**: Recently added items now show actual titles, series names, and season/episode info (e.g. S01E05).
- **Performance**: Reduced Firefox memory usage from ~1.5GB to under 100MB through SSE deduplication, React.memo on cards, throttled animations, and stable hook snapshots.
- **Settings Modal**: Wider layout with improved text contrast for all labels, hints, and descriptions.
- **Weather Widget**: API key and location now persist and show saved values when reopening settings.
- **Sparkline Loading**: Graphs now appear instantly on page load instead of waiting for the first SSE update.
- **Dashboard Width**: Content area expanded to 1920px max width.
- **Section Titles**: Larger, bolder section headers with shimmer effect.
- **Filter Bar**: Glass backdrop for visibility over background images.
- **Background Images**: Fixed background not showing after upload. Added auto compression for large images (up to 20MB input).

### Docker & Deployment
- Added Dockerfile with multi stage build.
- Added docker-compose.yml with persistent volume and environment variables.
- Added GitHub Actions workflow for automatic Docker Hub builds on push to main.
- Versioned Docker tags (e.g. 1.1.0, 1.1, latest).
- Made all paths relative and portable for other users.

## v1.0.0

- Initial release with real-time monitoring for 30+ services, SSE live updates, customisable colours/backgrounds/layout, multi-user auth with 2FA, AES-256 encrypted credentials, and audit logging.
