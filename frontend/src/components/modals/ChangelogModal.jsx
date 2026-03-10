import { useState } from 'react';

const CHANGELOG = [
  {
    version: '1.1.1',
    date: '2026-03-10',
    sections: [
      {
        title: 'Security',
        items: [
          'Upgraded Docker base image from Node 20 to Node 22',
          'Removed npm from production image (not needed at runtime) — eliminates 15 CVEs in bundled npm dependencies (tar, minimatch, cross-spawn, glob)',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-10',
    sections: [
      {
        title: 'New Features',
        items: [
          'SearXNG Search Bar — SearXNG apps now render as a full-width web search bar above the dashboard toolbar with live autocomplete suggestions',
          'Weather Widget — Optional weather display next to the search bar with animated weather icons (requires a free OpenWeatherMap API key)',
          'Live Clock — The top bar now features a live clock with date',
          'Universal Open Button — All apps with an Open URL now show a consistent "Open" button on their cards',
          'Open WebUI — Rich connector with models, users, chats, knowledge, prompts and tools stats. Authenticates via username/password',
          'Custom Dashboard Sections — Create, reorder (drag & drop), and configure dashboard sections from the Customise tab',
          'Dynamic Categories — Custom section names automatically become available as app categories',
          'Credential Persistence — Editing an app now shows saved credentials with eye toggle for visibility',
          'Changelog Viewer — Click the version number in the footer to view the changelog',
        ],
      },
      {
        title: 'Improvements',
        items: [
          'Nextcloud — Enriched connector with users, federated shares, app updates, CPU load, memory/swap usage, PHP and server info',
          'Portainer — Enriched connector with Docker version, image sizes, networks, container uptime, ports, and stacks',
          'Notifiarr — Rewrote connector with integrations, service health checks, uptime, and version info',
          'Jellyfin & Plex — Recently added items now show actual titles, series names, and episode info (e.g. S01E05)',
          'Performance — Reduced Firefox memory from ~1.5GB to under 100MB through SSE deduplication, React.memo, and throttled animations',
          'Settings Modal — Wider layout, improved text contrast for all labels, hints, and descriptions',
          'Weather Widget — API key and location now persist and show saved values when reopening settings',
          'Sparkline Loading — Graphs appear instantly on page load instead of waiting for SSE',
          'Dashboard Width — Content area expanded to 1920px max width',
          'Section Titles — Larger, bolder section headers with shimmer effect',
          'Filter Bar — Glass backdrop for visibility over background images',
          'Background Images — Fixed background not showing after upload. Auto compression for large images (up to 20MB)',
        ],
      },
      {
        title: 'Docker & Deployment',
        items: [
          'Dockerfile with multi-stage build',
          'docker-compose.yml with persistent volume and environment variables',
          'GitHub Actions workflow for automatic Docker Hub builds on push to main',
          'Versioned Docker tags (e.g. 1.1.0, 1.1, latest)',
          'All paths relative and portable for other users',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-15',
    sections: [
      {
        title: 'Initial Release',
        items: [
          'Dashboard with real-time monitoring for 30+ services',
          'SSE-powered live updates every 3 seconds',
          'Customisable colours, backgrounds, and layout',
          'Multi-user auth with 2FA support',
          'AES-256 encrypted credential storage',
          'Audit logging for all admin actions',
        ],
      },
    ],
  },
];

export default function ChangelogModal({ onClose }) {
  const [expanded, setExpanded] = useState(CHANGELOG[0]?.version);

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[8px] z-300 flex items-center justify-center p-[16px]"
      onClick={onClose}>
      <div className="bg-s1 border border-bd2 rounded-[18px] w-full max-w-[640px] max-h-[80vh] overflow-hidden animate-slideUp modal-box flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-[22px] pb-[16px] border-b border-bd shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.3px]">Changelog</h2>
            <p className="text-[12px] text-[#a1a1aa] mt-[2px]">What's new in Homelab Dashboard</p>
          </div>
          <button onClick={onClose}
            className="w-[30px] h-[30px] bg-s2 border border-bd rounded-[var(--radius-inner)] flex items-center justify-center text-[#a1a1aa] hover:text-t hover:bg-s3 transition-colors text-[14px]">
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-[22px]">
          {CHANGELOG.map((release, rIdx) => (
            <div key={release.version} className={rIdx > 0 ? 'mt-[20px]' : ''}>
              {/* Version header */}
              <button
                onClick={() => setExpanded(expanded === release.version ? null : release.version)}
                className="flex items-center gap-[10px] w-full text-left group"
              >
                <span className="text-[14px] font-semibold text-t">v{release.version}</span>
                <span className="text-[11px] text-[#a1a1aa] font-mono">{release.date}</span>
                <div className="flex-1 h-px bg-bd" />
                <span className="text-[12px] text-[#a1a1aa] group-hover:text-t transition-colors">
                  {expanded === release.version ? '▾' : '▸'}
                </span>
              </button>

              {/* Sections */}
              {expanded === release.version && (
                <div className="mt-[12px] space-y-[14px]">
                  {release.sections.map(section => (
                    <div key={section.title}>
                      <div className="text-[11px] font-semibold text-[#d4d4d8] uppercase tracking-[0.08em] mb-[8px]">
                        {section.title}
                      </div>
                      <ul className="space-y-[5px]">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex gap-[8px] text-[12px] text-[#a1a1aa] leading-[1.5]">
                            <span className="text-[#71717a] shrink-0 mt-[2px]">&#x2022;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-[16px] border-t border-bd text-center shrink-0">
          <a href="https://github.com/sirxsniper/homelab-dashboard" target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-[#a1a1aa] hover:text-t transition-colors">
            View on GitHub &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
