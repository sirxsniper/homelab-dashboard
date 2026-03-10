import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApps, createApp, updateApp, deleteApp, getAppCredential } from '../../api/apps';
import { getUsers, getMe, createUser, deleteUser, updateUser, disable2fa, getAuditLog } from '../../api/users';
import { setup2fa, confirm2fa } from '../../api/auth';
import { getUser } from '../../store/auth';
import { useCustomise, useCustomiseUpdate, resetAllCustomisation, DEFAULTS, getSections, DEFAULT_SECTIONS, getAllCategories } from '../../hooks/useCustomise';

const ICON_OPTIONS = [
  '🖥️', '💾', '🎬', '🎞️', '🛡️', '🕳️', '📈', '🔐', '🌐', '🐳', '📊', '🔗',
  '🖧', '💿', '🗄️', '🔒', '🔑', '📡', '⚙️', '🧩', '📦', '🗃️', '🏠', '☁️',
  '🎵', '🎮', '📷', '📁', '🛠️', '💻', '📋', '🧪', '🚀', '🔍', '📝', '🤖',
  '🗂️', '🌍', '⛁', '🪪', '📬', '🔔', '💡', '🧲', '📥', '📤', '🔄', '🏗️',
];

const APP_TYPE_CONFIG = {
  linux: {
    label: 'Linux Server (SSH)', defaultAuth: 'ssh', defaultCategory: 'Infrastructure', defaultIcon: '🐧',
    credFields: [
      { key: 'ssh_user', label: 'SSH Username', placeholder: 'root', type: 'text' },
      { key: 'ssh_password', label: 'SSH Password', placeholder: 'Leave blank if using SSH key', type: 'password', optional: true },
    ],
    credHint: 'Connects via SSH to collect system stats (CPU, RAM, GPU, Docker, etc). Uses ~/.ssh/id_ed25519 key if available, otherwise password. Works with any Linux server, VM, or Raspberry Pi.',
  },
  proxmox: {
    label: 'Proxmox VE', defaultAuth: 'api_key', defaultCategory: 'Infrastructure', defaultIcon: '🖥️',
    credFields: [
      { key: 'api_token', label: 'API Token', placeholder: 'user@pam!tokenid=secret-uuid', type: 'password' },
      { key: 'ssh_host', label: 'SSH Host (for GPU stats)', placeholder: 'IP of Proxmox host', type: 'text', optional: true },
      { key: 'ssh_user', label: 'SSH Username', placeholder: 'root (default)', type: 'text', optional: true },
      { key: 'ssh_password', label: 'SSH Password', placeholder: 'Leave blank if using SSH key', type: 'password', optional: true },
    ],
    credHint: 'GPU monitoring uses SSH. Set SSH Host to the Proxmox server IP. Uses key auth by default, or provide a password.',
  },
  unraid: {
    label: 'Unraid', defaultAuth: 'api_key', defaultCategory: 'Infrastructure', defaultIcon: '💾',
    credFields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your Unraid API key', type: 'password' },
      { key: 'ssh_host', label: 'SSH Host (for GPU stats)', placeholder: 'IP or hostname if different from URL', type: 'text', optional: true },
      { key: 'ssh_user', label: 'SSH Username', placeholder: 'root (default)', type: 'text', optional: true },
      { key: 'ssh_password', label: 'SSH Password', placeholder: 'Leave blank if using SSH key', type: 'password', optional: true },
    ],
    credHint: 'GPU monitoring uses SSH. Uses key auth by default, or provide SSH password.',
  },
  jellyfin: {
    label: 'Jellyfin', defaultAuth: 'api_key', defaultCategory: 'Media', defaultIcon: '🎬',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Dashboard → API Keys', type: 'password' }],
  },
  plex: {
    label: 'Plex', defaultAuth: 'api_key', defaultCategory: 'Media', defaultIcon: '🎞️',
    credFields: [{ key: 'api_key', label: 'X-Plex-Token', placeholder: 'Your Plex token (see app.plex.tv/desktop → XML trick or Plex Dash)', type: 'password' }],
  },
  adguard: {
    label: 'AdGuard Home', defaultAuth: 'basic_auth', defaultCategory: 'Network', defaultIcon: '🛡️',
    credFields: [
      { key: 'username', label: 'Username', placeholder: 'AdGuard admin username', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'AdGuard admin password', type: 'password' },
    ],
  },
  pihole: {
    label: 'Pi-hole', defaultAuth: 'api_key', defaultCategory: 'Network', defaultIcon: '🕳️',
    credFields: [{ key: 'api_token', label: 'API Token', placeholder: 'Settings → API → Show API Token', type: 'password' }],
  },
  uptime_kuma: {
    label: 'Uptime Kuma', defaultAuth: 'api_key', defaultCategory: 'Monitoring', defaultIcon: '📈',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → API Keys', type: 'password' }],
  },
  vaultwarden: {
    label: 'Vaultwarden', defaultAuth: 'none', defaultCategory: 'Security', defaultIcon: '🔐',
    credFields: [],
  },
  nginx_proxy: {
    label: 'Nginx Proxy Manager', defaultAuth: 'user_pass', defaultCategory: 'Network', defaultIcon: '🌐',
    credFields: [
      { key: 'email', label: 'Email (if no 2FA)', placeholder: 'admin@example.com', type: 'email', optional: true },
      { key: 'password', label: 'Password (if no 2FA)', placeholder: 'NPM admin password', type: 'password', optional: true },
      { key: 'api_key', label: 'API Token (recommended if 2FA enabled)', placeholder: 'Bearer token from NPM', type: 'password', optional: true },
    ],
    credHint: 'If your NPM account has 2FA, use an API token instead of email/password.',
  },
  portainer: {
    label: 'Portainer', defaultAuth: 'user_pass', defaultCategory: 'Infrastructure', defaultIcon: '🐳',
    credFields: [
      { key: 'username', label: 'Username', placeholder: 'admin', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'Portainer password', type: 'password' },
    ],
  },
  grafana: {
    label: 'Grafana', defaultAuth: 'api_key', defaultCategory: 'Monitoring', defaultIcon: '📊',
    credFields: [{ key: 'api_key', label: 'Service Account Token', placeholder: 'Admin → Service Accounts', type: 'password' }],
  },
  sonarr: {
    label: 'Sonarr', defaultAuth: 'api_key', defaultCategory: 'Automation', defaultIcon: '📺',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → General → API Key', type: 'password' }],
  },
  radarr: {
    label: 'Radarr', defaultAuth: 'api_key', defaultCategory: 'Automation', defaultIcon: '🎬',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → General → API Key', type: 'password' }],
  },
  bazarr: {
    label: 'Bazarr', defaultAuth: 'api_key', defaultCategory: 'Automation', defaultIcon: '💬',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → General → API Key', type: 'password' }],
  },
  prowlarr: {
    label: 'Prowlarr', defaultAuth: 'api_key', defaultCategory: 'Automation', defaultIcon: '🔍',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → General → API Key', type: 'password' }],
  },
  seerr: {
    label: 'Seerr (Overseerr/Jellyseerr)', defaultAuth: 'api_key', defaultCategory: 'Media', defaultIcon: '🎫',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → General → API Key', type: 'password' }],
    credHint: 'Works with Overseerr, Jellyseerr, and Seerr. Find the API key in Settings → General.',
  },
  sabnzbd: {
    label: 'SABnzbd', defaultAuth: 'api_key', defaultCategory: 'Downloads', defaultIcon: '📥',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Config → General → API Key', type: 'password' }],
  },
  qbittorrent: {
    label: 'qBittorrent', defaultAuth: 'user_pass', defaultCategory: 'Downloads', defaultIcon: '🧲',
    credFields: [
      { key: 'username', label: 'Username', placeholder: 'admin', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'qBittorrent password', type: 'password' },
    ],
  },
  metube: {
    label: 'MeTube', defaultAuth: 'none', defaultCategory: 'Downloads', defaultIcon: '📹',
    credFields: [],
  },
  tautulli: {
    label: 'Tautulli', defaultAuth: 'api_key', defaultCategory: 'Media', defaultIcon: '📊',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Settings → Web Interface → API Key', type: 'password' }],
  },
  immich: {
    label: 'Immich', defaultAuth: 'api_key', defaultCategory: 'Media', defaultIcon: '📷',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Account Settings → API Keys', type: 'password' }],
  },
  nextcloud: {
    label: 'Nextcloud', defaultAuth: 'basic_auth', defaultCategory: 'Infrastructure', defaultIcon: '☁️',
    credFields: [
      { key: 'username', label: 'Username', placeholder: 'Nextcloud admin user', type: 'text' },
      { key: 'password', label: 'App Password', placeholder: 'Settings → Security → App Passwords', type: 'password' },
    ],
  },
  searxng: {
    label: 'SearXNG', defaultAuth: 'none', defaultCategory: 'Misc', defaultIcon: '🔍',
    credFields: [],
  },
  ollama: {
    label: 'Ollama', defaultAuth: 'none', defaultCategory: 'Misc', defaultIcon: '🤖',
    credFields: [],
  },
  open_webui: {
    label: 'Open-WebUI', defaultAuth: 'user_pass', defaultCategory: 'Misc', defaultIcon: '💬',
    credFields: [
      { key: 'username', label: 'Email', placeholder: 'admin@example.com', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'Your Open-WebUI password', type: 'password' },
    ],
    credHint: 'Uses your Open-WebUI login credentials to authenticate. The dashboard signs in automatically to fetch models and status.',
  },
  linkding: {
    label: 'Linkding', defaultAuth: 'api_key', defaultCategory: 'Misc', defaultIcon: '🔗',
    credFields: [{ key: 'api_key', label: 'API Token', placeholder: 'Settings → REST API', type: 'password' }],
  },
  notifiarr: {
    label: 'Notifiarr', defaultAuth: 'api_key', defaultCategory: 'Misc', defaultIcon: '🔔',
    credFields: [{ key: 'api_key', label: 'API Key', placeholder: 'Notifiarr API Key', type: 'password', optional: true }],
  },
  speedtest_tracker: {
    label: 'Speedtest Tracker', defaultAuth: 'api_key', defaultCategory: 'Misc', defaultIcon: '🚀',
    credFields: [{ key: 'api_key', label: 'Bearer Token', placeholder: 'Settings → API', type: 'password', optional: true }],
  },
  iperf3: {
    label: 'iperf3', defaultAuth: 'none', defaultCategory: 'Misc', defaultIcon: '📡',
    credFields: [
      { key: 'host', label: 'Host', placeholder: 'IP or hostname of iperf3 server', type: 'text' },
      { key: 'port', label: 'Port', placeholder: '5201 (default)', type: 'text', optional: true },
    ],
    credHint: 'iperf3 is a status-only card — it checks if port 5201 is open.',
  },
  mariadb: {
    label: 'MariaDB', defaultAuth: 'user_pass', defaultCategory: 'Infrastructure', defaultIcon: '⛁',
    credFields: [
      { key: 'host', label: 'Host', placeholder: '127.0.0.1', type: 'text' },
      { key: 'port', label: 'Port', placeholder: '3306 (default)', type: 'text', optional: true },
      { key: 'username', label: 'Username', placeholder: 'root', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'MariaDB password', type: 'password' },
    ],
    credHint: 'Connects directly via MySQL protocol — no HTTP API.',
  },
  redis_server: {
    label: 'Redis', defaultAuth: 'api_key', defaultCategory: 'Infrastructure', defaultIcon: '🗃️',
    credFields: [
      { key: 'host', label: 'Host', placeholder: '127.0.0.1', type: 'text' },
      { key: 'port', label: 'Port', placeholder: '6379 (default)', type: 'text', optional: true },
      { key: 'password', label: 'Password', placeholder: 'Redis password (optional)', type: 'password', optional: true },
    ],
    credHint: 'Connects directly via Redis protocol — no HTTP API.',
  },
  phpmyadmin: {
    label: 'phpMyAdmin', defaultAuth: 'none', defaultCategory: 'Infrastructure', defaultIcon: '🗄️',
    credFields: [],
  },
  generic: {
    label: 'Generic (HTTP Ping)', defaultAuth: 'none', defaultCategory: 'Other', defaultIcon: '🔗',
    credFields: [],
  },
};

const APP_TYPES = Object.keys(APP_TYPE_CONFIG);

/* ── Shared input/button styles ── */
const inputCls = 'w-full bg-s1 border border-bd2 rounded-[var(--radius-inner)] py-[8px] px-[11px] text-[13px] text-t outline-none focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]';
const labelCls = 'block text-[12px] font-medium text-[#a1a1aa] mb-[5px]';
const btnPrimary = 'w-full py-[9px] bg-t text-bg rounded-[var(--radius-inner)] text-[14px] font-semibold hover:opacity-88 transition-opacity disabled:opacity-35';
const btnSecondary = 'py-[6px] px-[12px] rounded-[var(--radius-inner)] border border-bd2 bg-s2 text-t2 text-[12px] font-medium hover:bg-s3 hover:text-t transition-colors';
const btnDanger = 'py-[6px] px-[12px] rounded-[var(--radius-inner)] bg-rd border border-rb text-red text-[12px] font-medium hover:opacity-80 transition-opacity';
const btnGhost = 'py-[6px] px-[10px] text-[12px] text-[#a1a1aa] hover:text-t transition-colors';

export default function AdminModal({ onClose }) {
  const [tab, setTab] = useState('apps');
  const tabs = [
    ['apps', 'Apps'],
    ['add-app', 'Add App'],
    ['users', 'Users'],
    ['security', 'Security'],
    ['audit', 'Audit Log'],
    ['customise', 'Customise'],
  ];

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[8px] z-300 flex items-center justify-center p-[16px]"
      onClick={onClose}>
      <div className="bg-s1 border border-bd2 rounded-[18px] w-full max-w-[960px] max-h-[88vh] overflow-y-auto animate-slideUp modal-box"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-[26px] pb-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.3px]">Settings</h2>
          <button onClick={onClose}
            className="w-[30px] h-[30px] bg-s2 border border-bd rounded-[var(--radius-inner)] flex items-center justify-center text-t3 hover:text-t hover:bg-s3 transition-colors text-[14px]">
            &#x2715;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-[4px] px-[26px] mt-[16px] mb-[4px] border-b border-bd">
          {tabs.map(([key, label]) => (
            <button key={key}
              onClick={() => setTab(key)}
              className={`py-[8px] px-[12px] text-[12px] font-medium border-b-2 transition-colors -mb-px
                ${tab === key ? 'border-t text-t' : 'border-transparent text-[#71717a] hover:text-t'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-[26px] pt-[20px]">
          {tab === 'apps' && <ManageApps />}
          {tab === 'add-app' && <AppForm onDone={() => setTab('apps')} />}
          {tab === 'users' && <ManageUsers />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'audit' && <AuditLog />}
          {tab === 'customise' && <CustomiseSettings />}
        </div>
      </div>
    </div>
  );
}

/* ── Manage Apps ── */
function ManageApps() {
  const queryClient = useQueryClient();
  const { data: apps = [] } = useQuery({ queryKey: ['apps'], queryFn: getApps });
  const [editing, setEditing] = useState(null);
  const deleteMut = useMutation({
    mutationFn: deleteApp,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apps'] }); queryClient.invalidateQueries({ queryKey: ['stats'] }); },
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }) => updateApp(id, { enabled: enabled ? 0 : 1 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apps'] }); queryClient.invalidateQueries({ queryKey: ['stats'] }); },
  });

  if (editing) return <AppForm app={editing} onDone={() => setEditing(null)} />;

  return (
    <div>
      {apps.length === 0 && (
        <div className="text-center py-[40px] text-[#a1a1aa] text-[13px]">No apps configured yet</div>
      )}
      {apps.map(app => (
        <div key={app.id} className="flex items-center justify-between py-[10px] px-[13px] bg-s2 rounded-[var(--radius-inner)] mb-[5px]">
          <div className="flex items-center gap-[10px] min-w-0">
            <span className="text-[18px]">{app.icon}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate">{app.name}</div>
              <div className="text-[11px] text-[#a1a1aa] font-mono truncate">{app.url}</div>
            </div>
          </div>
          <div className="flex items-center gap-[6px] shrink-0 ml-[8px]">
            <span className={`w-[5px] h-[5px] rounded-full ${app.enabled ? 'bg-green' : 'bg-t3'}`} />
            <button className={btnSecondary} onClick={() => setEditing(app)}>Edit</button>
            <button className={btnDanger}
              onClick={() => { if (confirm(`Delete ${app.name}?`)) deleteMut.mutate(app.id); }}
              disabled={deleteMut.isPending}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Icon Picker ── */
function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button"
        className={`${inputCls} flex items-center gap-[8px] text-left`}
        onClick={() => setOpen(o => !o)}>
        <span className="text-[18px]">{value || '🔗'}</span>
        <span className="text-[#a1a1aa] text-[12px]">Click to change</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-[4px] bg-s1 border border-bd2 rounded-[var(--radius-inner)] p-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-[280px]">
          <div className="grid grid-cols-8 gap-[4px]">
            {ICON_OPTIONS.map(icon => (
              <button key={icon} type="button"
                className={`w-[30px] h-[30px] flex items-center justify-center rounded-[6px] text-[16px] hover:bg-s3 transition-colors
                  ${icon === value ? 'bg-s3 ring-1 ring-bd2' : ''}`}
                onClick={() => { onChange(icon); setOpen(false); }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Add / Edit App Form ── */
function AppForm({ app, onDone }) {
  const isEdit = !!app;
  const queryClient = useQueryClient();
  const customSettings = useCustomise();
  const categories = getAllCategories(customSettings);
  const initialType = app?.type || 'generic';
  const typeConfig = APP_TYPE_CONFIG[initialType] || APP_TYPE_CONFIG.generic;

  const [form, setForm] = useState({
    name: app?.name || '', url: app?.url || '', open_url: app?.open_url || '', type: initialType,
    category: app?.category || typeConfig.defaultCategory,
    icon: app?.icon || typeConfig.defaultIcon,
    poll_interval: app?.poll_interval || 30, sort_order: app?.sort_order || 0,
  });
  const [creds, setCreds] = useState({});
  const [showField, setShowField] = useState({});
  const [credLoaded, setCredLoaded] = useState(false);
  const [error, setError] = useState('');

  const currentConfig = APP_TYPE_CONFIG[form.type] || APP_TYPE_CONFIG.generic;
  const credFields = currentConfig.credFields || [];

  // Fetch existing credentials when editing
  useEffect(() => {
    if (!isEdit || !app?.has_credential) return;
    getAppCredential(app.id).then(data => {
      if (data && Object.keys(data).length > 0) {
        setCreds(data);
        setCredLoaded(true);
      }
    }).catch(() => {});
  }, [isEdit, app?.id, app?.has_credential]);

  const toggleShow = (key) => setShowField(s => ({ ...s, [key]: !s[key] }));

  const handleTypeChange = (newType) => {
    const config = APP_TYPE_CONFIG[newType] || APP_TYPE_CONFIG.generic;
    setForm(f => ({
      ...f, type: newType,
      category: f.category === (APP_TYPE_CONFIG[f.type]?.defaultCategory || 'Other') ? config.defaultCategory : f.category,
      icon: f.icon === (APP_TYPE_CONFIG[f.type]?.defaultIcon || '🔗') ? config.defaultIcon : f.icon,
    }));
    setCreds({});
  };

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateApp(app.id, data) : createApp(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apps'] }); queryClient.invalidateQueries({ queryKey: ['stats'] }); onDone(); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const credential = {};
    for (const field of credFields) { if (creds[field.key]) credential[field.key] = creds[field.key]; }
    const hasNewCreds = Object.keys(credential).length > 0;
    mutation.mutate({
      name: form.name, url: form.url, open_url: form.open_url || undefined, type: form.type, category: form.category,
      auth_type: currentConfig.defaultAuth, icon: form.icon || undefined,
      poll_interval: parseInt(form.poll_interval) || 30, sort_order: parseInt(form.sort_order) || 0,
      credential: hasNewCreds ? credential : undefined,
    });
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setCred = (key, val) => setCreds(c => ({ ...c, [key]: val }));

  return (
    <form onSubmit={handleSubmit}>
      {isEdit && (
        <div className="flex items-center gap-[8px] mb-[16px]">
          <button type="button" className={btnGhost} onClick={onDone}>&larr; Back</button>
          <span className="text-[13px] text-[#a1a1aa]">Editing: {app.name}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-[9px] form-2col">
        <div className="col-span-2">
          <label className={labelCls}>App Type</label>
          <select className={inputCls} value={form.type} onChange={e => handleTypeChange(e.target.value)}>
            {APP_TYPES.map(t => <option key={t} value={t}>{APP_TYPE_CONFIG[t].label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} required value={form.name} onChange={e => set('name', e.target.value)} placeholder={currentConfig.label} />
        </div>
        <div>
          <label className={labelCls}>API URL *</label>
          <input className={inputCls} required value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://192.168.1.x:8096" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Open URL <span className="font-normal text-[#a1a1aa]">(optional — browser link)</span></label>
          <input className={inputCls} value={form.open_url} onChange={e => set('open_url', e.target.value)} placeholder="https://myapp.example.com (leave blank to use API URL)" />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <CategoryPicker value={form.category} onChange={v => set('category', v)} categories={categories} />
        </div>
        <div>
          <label className={labelCls}>Poll Interval (s)</label>
          <input className={inputCls} type="number" min="10" value={form.poll_interval} onChange={e => set('poll_interval', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Icon</label>
          <IconPicker value={form.icon} onChange={v => set('icon', v)} />
        </div>
        <div>
          <label className={labelCls}>Sort Order</label>
          <input className={inputCls} type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
        </div>
      </div>

      {credFields.length > 0 && (
        <div className="mt-[16px] p-[16px] bg-s2 rounded-[var(--radius-inner)]">
          <div className="text-[10px] font-semibold text-[#d4d4d8] uppercase tracking-[0.1em] mb-[12px]">
            Credentials <span className="font-normal text-[#a1a1aa]">(encrypted AES-256)</span>
          </div>
          {currentConfig.credHint && (
            <div className="bg-ad text-amber text-[11px] px-[10px] py-[8px] rounded-[var(--radius-tag)] mb-[10px] leading-[1.5]">
              {currentConfig.credHint}
            </div>
          )}
          {credFields.map(field => {
            const isSecret = field.type === 'password';
            const shown = showField[field.key];
            return (
              <div key={field.key} className="mb-[10px]">
                <label className={labelCls}>{field.label}</label>
                <div className="relative">
                  <input className={inputCls + ' pr-[36px]'} type={isSecret && !shown ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={creds[field.key] || ''} onChange={e => setCred(field.key, e.target.value)} autoComplete="off" />
                  {isSecret && (
                    <button type="button" onClick={() => toggleShow(field.key)}
                      className="absolute right-[8px] top-1/2 -translate-y-1/2 text-t3 hover:text-t transition-colors"
                      title={shown ? 'Hide' : 'Show'}>
                      {shown ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mt-[12px]">{error}</div>}

      <div className="flex gap-[7px] mt-[16px]">
        {isEdit && (
          <button type="button" onClick={onDone}
            className="flex-1 py-[9px] bg-transparent border border-bd text-[#a1a1aa] rounded-[var(--radius-inner)] text-[13px] font-medium hover:text-t transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={mutation.isPending}
          className={`${isEdit ? 'flex-2' : 'w-full'} ${btnPrimary}`}>
          {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Application'}
        </button>
      </div>
    </form>
  );
}

/* ── Manage Users ── */
function ManageUsers() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const deleteMut = useMutation({ mutationFn: deleteUser, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }) });
  const disable2faMut = useMutation({ mutationFn: disable2fa, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }) });

  if (showCreate || editingUser) return <UserForm user={editingUser} onDone={() => { setShowCreate(false); setEditingUser(null); }} />;
  if (isLoading) return <div className="flex justify-center py-[24px]"><div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-[12px]">
        <span className="text-[12px] text-[#a1a1aa]">{users.length} user(s)</span>
        <button className={btnSecondary} onClick={() => setShowCreate(true)}>+ Add User</button>
      </div>
      {users.map(user => (
        <div key={user.id} className="flex items-center justify-between py-[10px] px-[13px] bg-s2 rounded-[var(--radius-inner)] mb-[5px]">
          <div className="flex items-center gap-[10px]">
            <div className="w-[28px] h-[28px] bg-s3 border border-bd2 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-[13px] font-medium">{user.username}</div>
              <div className="text-[11px] text-[#a1a1aa]">
                2FA: {user.totp_enabled ? 'enabled' : 'off'}
                {user.last_login && ` \u00B7 Last: ${new Date(user.last_login * 1000).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-[6px] shrink-0">
            <span className={`py-[4px] px-[8px] rounded-[4px] text-[10px] font-mono uppercase
              ${user.role === 'admin' ? 'bg-pd text-purple' : 'bg-bld text-blue'}`}>
              {user.role}
            </span>
            <button className={btnSecondary} onClick={() => setEditingUser(user)}>Edit</button>
            {user.totp_enabled && (
              <button className={btnSecondary}
                onClick={() => { if (confirm(`Disable 2FA for ${user.username}?`)) disable2faMut.mutate(user.id); }}>
                Reset 2FA
              </button>
            )}
            <button className={btnDanger}
              onClick={() => { if (confirm(`Delete user ${user.username}?`)) deleteMut.mutate(user.id); }}
              disabled={deleteMut.isPending || user.id === getUser()?.id}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Create / Edit User Form ── */
function UserForm({ user, onDone }) {
  const isEdit = !!user;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: user?.username || '', password: '', role: user?.role || 'viewer' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateUser(user.id, data) : createUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onDone(); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const data = { username: form.username, role: form.role };
    if (form.password) data.password = form.password;
    if (!isEdit && !form.password) { setError('Password is required'); return; }
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-[8px] mb-[16px]">
        <button type="button" className={btnGhost} onClick={onDone}>&larr; Back</button>
        <span className="text-[13px] text-[#a1a1aa]">{isEdit ? `Editing: ${user.username}` : 'New User'}</span>
      </div>
      <div className="grid grid-cols-2 gap-[9px]">
        <div>
          <label className={labelCls}>Username</label>
          <input className={inputCls} required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{isEdit ? 'New Password (blank = keep)' : 'Password (min 12)'}</label>
          <input className={inputCls} type="password" value={form.password}
            minLength={form.password ? 12 : undefined} required={!isEdit}
            placeholder={isEdit ? 'Leave blank to keep' : 'Min 12 characters'}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
      </div>
      {error && <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mt-[12px]">{error}</div>}
      <button type="submit" disabled={mutation.isPending} className={`mt-[16px] ${btnPrimary}`}>
        {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
      </button>
    </form>
  );
}

/* ── Security Settings ── */
function SecuritySettings() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => getMe() });
  const [section, setSection] = useState(null);

  if (section === 'password') return <ChangePassword onDone={() => setSection(null)} />;
  if (section === '2fa') return <Setup2FA onDone={() => { setSection(null); queryClient.invalidateQueries({ queryKey: ['me'] }); }} />;

  return (
    <div>
      <div className="text-[10px] font-semibold text-[#d4d4d8] uppercase tracking-[0.1em] mb-[12px]">Account Security</div>
      <div className="grid grid-cols-2 gap-[8px] mb-[16px]">
        <InfoBox label="Password" value="Set" color="green" action={<button className={btnSecondary} onClick={() => setSection('password')}>Change</button>} />
        <InfoBox label="2FA Status" value={me?.totp_enabled ? 'Enabled' : 'Disabled'} color={me?.totp_enabled ? 'green' : 'amber'}
          action={!me?.totp_enabled ? <button className={btnSecondary} onClick={() => setSection('2fa')}>Enable</button> : null} />
        <InfoBox label="Encryption" value="AES-256" color="blue" />
        <InfoBox label="Brute Force" value="Rate Limited" color="purple" />
      </div>
      <div className="text-[11px] text-[#a1a1aa] pt-[8px] border-t border-bd">
        Logged in as: <span className="text-t font-medium">{getUser()?.username}</span> ({getUser()?.role})
      </div>
    </div>
  );
}

function InfoBox({ label, value, color, action }) {
  const colorCls = { green: 'text-green', blue: 'text-blue', purple: 'text-purple', amber: 'text-amber' };
  return (
    <div className="bg-s2 rounded-[var(--radius-inner)] p-[12px]">
      <div className="text-[10px] text-[#a1a1aa] uppercase tracking-[0.07em] font-medium mb-[4px]">{label}</div>
      <div className="flex items-center justify-between">
        <span className={`text-[14px] font-semibold ${colorCls[color] || 'text-t'}`}>{value}</span>
        {action}
      </div>
    </div>
  );
}

/* ── Change Password ── */
function ChangePassword({ onDone }) {
  const currentUser = getUser();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => updateUser(currentUser.id, data),
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.newPass !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.newPass.length < 12) { setError('Password must be at least 12 characters'); return; }
    mutation.mutate({ current_password: form.current, password: form.newPass });
  };

  if (success) {
    return (
      <div className="text-center py-[24px]">
        <div className="text-[32px] mb-[8px] text-green">&#10003;</div>
        <div className="text-green font-semibold mb-[16px]">Password changed successfully</div>
        <button className={btnSecondary} onClick={onDone}>Back</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-[8px] mb-[16px]">
        <button type="button" className={btnGhost} onClick={onDone}>&larr; Back</button>
        <span className="text-[13px] text-[#a1a1aa]">Change Password</span>
      </div>
      <div className="flex flex-col gap-[12px]">
        <div>
          <label className={labelCls}>Current Password</label>
          <input className={inputCls} type="password" required value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>New Password (min 12)</label>
          <input className={inputCls} type="password" required minLength={12} value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Confirm New Password</label>
          <input className={inputCls} type="password" required value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
      </div>
      {error && <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mt-[12px]">{error}</div>}
      <button type="submit" disabled={mutation.isPending} className={`mt-[16px] ${btnPrimary}`}>
        {mutation.isPending ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}

/* ── 2FA Setup ── */
function Setup2FA({ onDone }) {
  const [step, setStep] = useState('loading');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const setupMut = useMutation({
    mutationFn: setup2fa,
    onSuccess: (data) => { setQr(data.qr_code); setSecret(data.secret); setStep('scan'); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to generate QR'),
  });

  const confirmMut = useMutation({
    mutationFn: () => confirm2fa(token),
    onSuccess: () => setStep('done'),
    onError: (err) => setError(err.response?.data?.error || 'Invalid code'),
  });

  if (step === 'loading' && !setupMut.isPending && !qr) setupMut.mutate();

  if (step === 'done') {
    return (
      <div className="text-center py-[24px]">
        <div className="text-[32px] mb-[8px]">&#128274;</div>
        <div className="text-green font-semibold mb-[8px]">2FA Enabled Successfully</div>
        <div className="text-[12px] text-[#a1a1aa] mb-[16px]">Your account is now protected with two-factor authentication.</div>
        <button className={btnSecondary} onClick={onDone}>Done</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-[8px] mb-[16px]">
        <button className={btnGhost} onClick={onDone}>&larr; Back</button>
        <span className="text-[13px] text-[#a1a1aa]">Setup Two-Factor Authentication</span>
      </div>

      {setupMut.isPending && <div className="flex justify-center py-[24px]"><div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" /></div>}

      {step === 'scan' && (
        <div>
          <div className="text-center mb-[16px]">
            <div className="text-[13px] text-t2 mb-[12px]">Scan with your authenticator app:</div>
            {qr && <img src={qr} alt="2FA QR" className="max-w-[200px] mx-auto rounded-[8px]" />}
          </div>
          <div className="text-center mb-[16px]">
            <div className="text-[11px] text-[#a1a1aa] mb-[4px]">Manual entry key:</div>
            <code className="inline-block bg-s2 border border-bd px-[12px] py-[6px] rounded-[var(--radius-tag)] text-[13px] font-mono text-t2 select-all">
              {secret}
            </code>
          </div>
          <div className="border-t border-bd pt-[16px]">
            <div className="text-[13px] text-t2 mb-[8px]">Enter 6-digit code to confirm:</div>
            <input className={`${inputCls} font-mono !text-[24px] text-center tracking-[0.45em] !py-[14px]`}
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000"
              value={token} onChange={e => { setToken(e.target.value.replace(/\D/g, '')); setError(''); }} />
            {error && <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mt-[8px]">{error}</div>}
            <button className={`mt-[12px] ${btnPrimary}`}
              disabled={token.length !== 6 || confirmMut.isPending}
              onClick={() => confirmMut.mutate()}>
              {confirmMut.isPending ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Audit Log ── */
function AuditLog() {
  const [page, setPage] = useState(0);
  const limit = 25;
  const { data, isLoading } = useQuery({ queryKey: ['audit', page], queryFn: () => getAuditLog(limit, page * limit) });

  if (isLoading) return <div className="flex justify-center py-[24px]"><div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" /></div>;

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="text-[12px] text-[#a1a1aa] mb-[12px]">{total} total entries</div>
      {entries.length === 0 ? (
        <div className="text-center py-[40px] text-[#a1a1aa] text-[13px]">No audit entries yet</div>
      ) : (
        <div className="flex flex-col gap-[4px]">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between py-[8px] px-[10px] bg-s2 rounded-[var(--radius-inner)]">
              <div className="min-w-0">
                <span className="text-[12px] font-medium text-t2">{e.action}</span>
                <span className="text-[11px] text-[#a1a1aa] ml-[8px]">
                  {e.username || 'system'}{e.detail ? ` \u2014 ${e.detail}` : ''}
                </span>
              </div>
              <div className="text-right shrink-0 ml-[8px]">
                <div className="text-[10px] text-[#a1a1aa] font-mono">{new Date(e.created_at * 1000).toLocaleString()}</div>
                <div className="text-[10px] text-[#a1a1aa]">{e.ip}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-[8px] mt-[16px]">
          <button className={btnSecondary} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="text-[12px] text-[#a1a1aa] font-mono">Page {page + 1} of {totalPages}</span>
          <button className={btnSecondary} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

/* ── Customise Settings ── */

function ColourPicker({ label, settingKey, settings, update, defaultVal }) {
  const val = settings[settingKey] ?? defaultVal;
  const isDefault = val === defaultVal;
  return (
    <div className="flex items-center gap-[8px] min-w-0">
      <input type="color" value={val} onChange={e => update(settingKey, e.target.value)}
        className="w-[30px] h-[26px] bg-transparent border border-bd2 rounded-[4px] cursor-pointer p-[1px] shrink-0" />
      <span className="text-[11px] text-[#a1a1aa] truncate flex-1">{label}</span>
      {!isDefault && (
        <button type="button" onClick={() => update(settingKey, defaultVal)}
          className="text-[10px] text-[#a1a1aa] hover:text-t2 shrink-0">↺</button>
      )}
    </div>
  );
}

function SectionHeader({ children }) {
  return <div className="text-[11px] font-semibold text-[#d4d4d8] uppercase tracking-[0.1em] mb-[10px] mt-[20px] first:mt-0">{children}</div>;
}

function PasswordField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className={inputCls + ' pr-[36px]'} type={show ? 'text' : 'password'}
        value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete="off" />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-[8px] top-1/2 -translate-y-1/2 text-t3 hover:text-t transition-colors"
        title={show ? 'Hide' : 'Show'}>
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function CategoryPicker({ value, onChange, categories }) {
  const [custom, setCustom] = useState(false);
  const showCustom = custom || !categories.includes(value);

  if (showCustom) {
    return (
      <div className="flex gap-[6px]">
        <input className={inputCls + ' flex-1'} type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="Type category name" autoFocus={custom} />
        <button type="button" onClick={() => { setCustom(false); if (!categories.includes(value)) onChange(categories[0]); }}
          className="shrink-0 py-[7px] px-[10px] rounded-[var(--radius-inner)] text-[11px] font-medium bg-s2 border border-bd text-[#71717a] hover:text-t transition-colors">
          List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-[6px]">
      <select className={inputCls + ' flex-1'} value={value} onChange={e => onChange(e.target.value)}>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="button" onClick={() => setCustom(true)}
        className="shrink-0 py-[7px] px-[10px] rounded-[var(--radius-inner)] text-[11px] font-medium bg-s2 border border-bd text-[#71717a] hover:text-t transition-colors"
        title="Type a custom category">
        +
      </button>
    </div>
  );
}

function WeatherSettings({ settings, update }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <>
      <div className="mb-[14px]">
        <label className={labelCls}>API Key</label>
        <div className="relative">
          <input className={inputCls + ' pr-[36px]'} type={showKey ? 'text' : 'password'}
            value={settings.weatherApiKey || ''} onChange={e => update('weatherApiKey', e.target.value)}
            placeholder="Enter OpenWeatherMap API key" autoComplete="off" />
          <button type="button" onClick={() => setShowKey(!showKey)}
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-t3 hover:text-t transition-colors">
            {showKey ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        <div className="text-[11px] text-[#a1a1aa] mt-[4px]">Get a free key at openweathermap.org. Stored locally in your browser.</div>
      </div>

      <div className="mb-[14px]">
        <label className={labelCls}>Location</label>
        <input className={inputCls} value={settings.weatherLocation || ''} onChange={e => update('weatherLocation', e.target.value)}
          placeholder="e.g. London,GB" />
        <div className="text-[11px] text-[#a1a1aa] mt-[4px]">City name with optional country code (e.g. Berlin,DE)</div>
      </div>
    </>
  );
}

function CustomiseSettings() {
  const settings = useCustomise();
  const update = useCustomiseUpdate();
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState('');

  const fmtSize = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;

  // Compress image via canvas — maxDim limits resolution, quality controls JPEG compression
  const compressImage = (file, maxDim, quality) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });

  const handleImageUpload = (key, { maxFileSize, maxDim, quality, label }) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (file.size > maxFileSize) {
      setUploadError(`${label} is too large (${fmtSize(file.size)}). Maximum file size is ${fmtSize(maxFileSize)}.`);
      e.target.value = '';
      return;
    }

    setUploading(key);
    try {
      const dataUrl = await compressImage(file, maxDim, quality);
      try {
        update(key, dataUrl);
      } catch {
        setUploadError(`Failed to store ${label.toLowerCase()}. Browser storage is full — try a smaller image or reset other customisations.`);
      }
    } catch {
      setUploadError(`Failed to process ${label.toLowerCase()}. Make sure it's a valid image file.`);
    } finally {
      setUploading('');
      e.target.value = '';
    }
  };

  const columnOptions = [1, 2, 3, 4, 5];

  return (
    <div>
      {/* Upload error banner */}
      {uploadError && (
        <div className="flex items-center gap-[8px] mb-[14px] p-[10px] rounded-[var(--radius-inner)] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-[12px] text-red">
          <span className="shrink-0">⚠</span>
          <span className="flex-1">{uploadError}</span>
          <button type="button" className="text-t3 hover:text-t text-[16px] leading-none" onClick={() => setUploadError('')}>&times;</button>
        </div>
      )}

      {/* ── General ── */}
      <SectionHeader>General</SectionHeader>

      <div className="mb-[14px]">
        <label className={labelCls}>Dashboard Name</label>
        <input className={inputCls} value={settings.name} onChange={e => update('name', e.target.value)}
          placeholder="Homelab" />
        <div className="text-[11px] text-[#a1a1aa] mt-[4px]">Replaces "Homelab" in the topbar and browser title</div>
      </div>

      <div className="mb-[14px]">
        <label className={labelCls}>Logo</label>
        {settings.logo ? (
          <div className="flex items-center gap-[10px]">
            <div className="w-[36px] h-[36px] rounded-[8px] border border-bd2 overflow-hidden bg-s2 shrink-0">
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[12px] text-[#a1a1aa] flex-1">Custom logo active</span>
            <button type="button" className={btnDanger} onClick={() => update('logo', '')}>Remove</button>
          </div>
        ) : (
          <div>
            <label className={`${btnSecondary} inline-block cursor-pointer`}>
              {uploading === 'logo' ? 'Processing...' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('logo', { maxFileSize: 10 * 1024 * 1024, maxDim: 256, quality: 0.85, label: 'Logo' })} />
            </label>
            <div className="text-[11px] text-[#a1a1aa] mt-[4px]">Shown in the topbar. Falls back to text if not set. Auto-resized to fit.</div>
          </div>
        )}
      </div>

      <div className="mb-[14px]">
        <label className={labelCls}>Background Image</label>
        {settings.bgImage ? (
          <div>
            <div className="relative w-full h-[80px] rounded-[var(--radius-inner)] overflow-hidden mb-[6px] border border-bd2">
              <img src={settings.bgImage} alt="Background" className="w-full h-full object-cover" />
            </div>
            <button type="button" className={btnDanger} onClick={() => update('bgImage', '')}>Remove Image</button>
          </div>
        ) : (
          <div>
            <label className={`${btnSecondary} inline-block cursor-pointer`}>
              {uploading === 'bgImage' ? 'Processing...' : 'Choose Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('bgImage', { maxFileSize: 20 * 1024 * 1024, maxDim: 2560, quality: 0.80, label: 'Background image' })} />
            </label>
            <div className="text-[11px] text-[#a1a1aa] mt-[4px]">Stored locally in your browser. Large images are auto-compressed to fit. (max 20MB)</div>
          </div>
        )}
      </div>

      <div className="mb-[14px]">
        <label className={labelCls}>Card Radius</label>
        <div className="flex items-center gap-[10px]">
          <input type="range" min="0" max="24" value={settings.cardRadius} onChange={e => update('cardRadius', Number(e.target.value))}
            className="flex-1 accent-[var(--color-t2)]" />
          <span className="text-[12px] font-mono text-t2 w-[36px] text-right">{settings.cardRadius}px</span>
        </div>
      </div>

      {/* ── Weather Widget ── */}
      <SectionHeader>Weather Widget</SectionHeader>
      <div className="text-[11px] text-[#a1a1aa] mb-[8px]">Shows live weather next to the search bar. Requires a free OpenWeatherMap API key.</div>

      <WeatherSettings settings={settings} update={update} />

      <div className="mb-[14px]">
        <label className={labelCls}>Units</label>
        <div className="flex gap-[4px]">
          {[['metric', '°C'], ['imperial', '°F']].map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => update('weatherUnits', val)}
              className={`px-[14px] py-[6px] rounded-[4px] text-[12px] font-medium border transition-colors
                ${settings.weatherUnits === val
                  ? 'bg-s2 border-bd2 text-t'
                  : 'bg-transparent border-bd text-[#71717a] hover:text-t hover:border-bd2'
                }`}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Surface & Background Colours ── */}
      <SectionHeader>Surface Colours</SectionHeader>
      <div className="grid grid-cols-2 gap-[8px] mb-[4px]">
        <ColourPicker label="Background" settingKey="bgColour" settings={settings} update={update} defaultVal={DEFAULTS.bgColour} />
        <ColourPicker label="Card Surface" settingKey="cardBg" settings={settings} update={update} defaultVal={DEFAULTS.cardBg} />
        <ColourPicker label="Card Inner" settingKey="cardBg2" settings={settings} update={update} defaultVal={DEFAULTS.cardBg2} />
        <ColourPicker label="Card Hover" settingKey="cardBg3" settings={settings} update={update} defaultVal={DEFAULTS.cardBg3} />
      </div>

      {/* ── Text Colours ── */}
      <SectionHeader>Text Colours</SectionHeader>
      <div className="grid grid-cols-2 gap-[8px] mb-[4px]">
        <ColourPicker label="Primary" settingKey="textPrimary" settings={settings} update={update} defaultVal={DEFAULTS.textPrimary} />
        <ColourPicker label="Secondary" settingKey="textSecondary" settings={settings} update={update} defaultVal={DEFAULTS.textSecondary} />
        <ColourPicker label="Tertiary" settingKey="textTertiary" settings={settings} update={update} defaultVal={DEFAULTS.textTertiary} />
      </div>

      {/* ── Category Accent Colours ── */}
      <SectionHeader>Category Accent Colours</SectionHeader>
      <div className="text-[11px] text-[#a1a1aa] mb-[8px]">Accent colour shown on cards and progress bars per category</div>
      <div className="grid grid-cols-2 gap-[8px] mb-[4px]">
        <ColourPicker label="Infrastructure" settingKey="accentInfra" settings={settings} update={update} defaultVal={DEFAULTS.accentInfra} />
        <ColourPicker label="Media" settingKey="accentMedia" settings={settings} update={update} defaultVal={DEFAULTS.accentMedia} />
        <ColourPicker label="Network" settingKey="accentNetwork" settings={settings} update={update} defaultVal={DEFAULTS.accentNetwork} />
        <ColourPicker label="Monitoring" settingKey="accentMonitoring" settings={settings} update={update} defaultVal={DEFAULTS.accentMonitoring} />
        <ColourPicker label="Security" settingKey="accentSecurity" settings={settings} update={update} defaultVal={DEFAULTS.accentSecurity} />
        <ColourPicker label="Downloads" settingKey="accentDownloads" settings={settings} update={update} defaultVal={DEFAULTS.accentDownloads} />
        <ColourPicker label="Automation" settingKey="accentAutomation" settings={settings} update={update} defaultVal={DEFAULTS.accentAutomation} />
        <ColourPicker label="Misc" settingKey="accentMisc" settings={settings} update={update} defaultVal={DEFAULTS.accentMisc} />
      </div>

      {/* ── Status Colours ── */}
      <SectionHeader>Status Indicator Colours</SectionHeader>
      <div className="grid grid-cols-2 gap-[8px] mb-[4px]">
        <ColourPicker label="Online" settingKey="statusOnline" settings={settings} update={update} defaultVal={DEFAULTS.statusOnline} />
        <ColourPicker label="Warning" settingKey="statusWarning" settings={settings} update={update} defaultVal={DEFAULTS.statusWarning} />
        <ColourPicker label="Offline" settingKey="statusOffline" settings={settings} update={update} defaultVal={DEFAULTS.statusOffline} />
      </div>

      {/* ── Graph / Chart Colours ── */}
      <SectionHeader>Graph & Chart Colours</SectionHeader>
      <div className="text-[11px] text-[#a1a1aa] mb-[8px]">Colours for 24h history charts and card sparklines</div>
      <div className="grid grid-cols-2 gap-[8px] mb-[4px]">
        <ColourPicker label="CPU" settingKey="graphCpu" settings={settings} update={update} defaultVal={DEFAULTS.graphCpu} />
        <ColourPicker label="RAM" settingKey="graphRam" settings={settings} update={update} defaultVal={DEFAULTS.graphRam} />
        <ColourPicker label="Temperature" settingKey="graphTemp" settings={settings} update={update} defaultVal={DEFAULTS.graphTemp} />
        <ColourPicker label="Docker" settingKey="graphDocker" settings={settings} update={update} defaultVal={DEFAULTS.graphDocker} />
        <ColourPicker label="Upload" settingKey="graphUpload" settings={settings} update={update} defaultVal={DEFAULTS.graphUpload} />
        <ColourPicker label="Download" settingKey="graphDownload" settings={settings} update={update} defaultVal={DEFAULTS.graphDownload} />
        <ColourPicker label="Sparkline CPU" settingKey="sparkCpu" settings={settings} update={update} defaultVal={DEFAULTS.sparkCpu} />
        <ColourPicker label="Sparkline RAM" settingKey="sparkRam" settings={settings} update={update} defaultVal={DEFAULTS.sparkRam} />
        <ColourPicker label="Generic" settingKey="graphGeneric" settings={settings} update={update} defaultVal={DEFAULTS.graphGeneric} />
      </div>

      {/* ── Dashboard Sections ── */}
      <SectionHeader>Dashboard Sections</SectionHeader>
      <div className="text-[11px] text-[#a1a1aa] mb-[10px]">Create, reorder, and configure dashboard sections. Drag to reorder.</div>
      <SectionManager settings={settings} update={update} columnOptions={columnOptions} />

      {/* ── Reset All ── */}
      <div className="mt-[24px] pt-[16px] border-t border-bd">
        <button type="button" className={btnDanger} onClick={() => {
          if (confirm('Reset all customisation to defaults?')) resetAllCustomisation();
        }}>
          Reset Everything to Defaults
        </button>
        <div className="text-[11px] text-[#a1a1aa] mt-[4px]">All colour, layout, and background settings will be reset</div>
      </div>
    </div>
  );
}

/* ── Section Manager with Drag-to-Reorder ── */
function SectionManager({ settings, update, columnOptions }) {
  const sections = getSections(settings);
  const [editIdx, setEditIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const save = (newSections) => update('sections', newSections);

  const reorder = (from, to) => {
    if (from === to) return;
    const arr = [...sections];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    save(arr);
  };

  const updateSection = (idx, patch) => {
    const arr = sections.map((s, i) => i === idx ? { ...s, ...patch } : s);
    save(arr);
  };

  const deleteSection = (idx) => {
    save(sections.filter((_, i) => i !== idx));
  };

  const addSection = () => {
    const key = 'section_' + Date.now();
    const newSec = { key, label: 'New Section', filterMode: 'categories', types: [], categories: [], colCount: 3 };
    save([...sections, newSec]);
    setEditIdx(sections.length);
  };

  const resetSections = () => {
    update('sections', null);
    setEditIdx(null);
  };

  return (
    <div className="space-y-[2px] mb-[4px]">
      {sections.map((sec, i) => (
        <div key={sec.key}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
          onDragEnter={() => setOverIdx(i)}
          onDragLeave={() => { if (overIdx === i) setOverIdx(null); }}
          onDrop={(e) => { e.preventDefault(); reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          className={`rounded-[var(--radius-inner)] border transition-all
            ${dragIdx === i ? 'opacity-30' : ''}
            ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'border-t-[rgba(255,255,255,0.4)] border-t-2' : 'border-bd'}
            bg-s1`}
        >
          {/* Row header */}
          <div className="flex items-center gap-[8px] px-[10px] py-[8px]">
            <span className="cursor-grab text-t3 text-[14px] select-none" title="Drag to reorder">&#x2807;</span>
            <span className="text-[12px] text-t font-medium flex-1 truncate">{sec.label}</span>
            <span className="text-[10px] text-[#a1a1aa] shrink-0">
              {sec.filterMode === 'types' ? sec.types.join(', ') : sec.categories.join(', ') || 'none'}
            </span>
            {/* Column count inline */}
            <div className="flex gap-[2px] ml-[4px]">
              {columnOptions.map(n => (
                <button key={n} type="button" onClick={() => updateSection(i, { colCount: n })}
                  className={`w-[22px] h-[20px] rounded-[3px] text-[10px] font-medium border transition-colors
                    ${sec.colCount === n
                      ? 'bg-s2 border-bd2 text-t'
                      : 'bg-transparent border-bd text-[#71717a] hover:text-t'
                    }`}
                >{n}</button>
              ))}
            </div>
            <button type="button" onClick={() => setEditIdx(editIdx === i ? null : i)}
              className="text-t3 hover:text-t text-[13px] px-[4px] transition-colors" title="Edit">
              &#x270E;
            </button>
            <button type="button" onClick={() => { if (confirm(`Delete "${sec.label}"?`)) deleteSection(i); }}
              className="text-t3 hover:text-red text-[13px] px-[4px] transition-colors" title="Delete">
              &times;
            </button>
          </div>

          {/* Expanded editor */}
          {editIdx === i && (
            <SectionEditor
              section={sec}
              onChange={(patch) => updateSection(i, patch)}
              onClose={() => setEditIdx(null)}
              allCategories={getAllCategories(settings)}
            />
          )}
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-[8px] mt-[10px]">
        <button type="button" onClick={addSection}
          className="py-[6px] px-[14px] rounded-[var(--radius-inner)] text-[12px] font-medium bg-s2 border border-bd text-t2 hover:text-t hover:border-bd2 transition-colors">
          + Add Section
        </button>
        <button type="button" onClick={resetSections}
          className="py-[6px] px-[14px] rounded-[var(--radius-inner)] text-[12px] font-medium bg-transparent border border-bd text-[#71717a] hover:text-t hover:border-bd2 transition-colors">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

/* ── Section Editor (inline) ── */
function SectionEditor({ section, onChange, onClose, allCategories }) {

  const toggleCategory = (cat) => {
    const cats = section.categories || [];
    const next = cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat];
    onChange({ categories: next });
  };

  return (
    <div className="px-[10px] pb-[10px] border-t border-bd mt-[2px] pt-[10px] space-y-[10px]">
      {/* Label */}
      <div>
        <label className="block text-[11px] text-[#a1a1aa] mb-[4px] font-medium">Section Name</label>
        <input type="text" value={section.label} onChange={(e) => onChange({ label: e.target.value })}
          className="w-full bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[6px] px-[10px] text-[12px] text-t outline-none focus:border-[rgba(255,255,255,0.2)]" />
      </div>

      {/* Filter mode */}
      <div>
        <label className="block text-[11px] text-[#a1a1aa] mb-[4px] font-medium">Filter By</label>
        <div className="flex gap-[4px]">
          {['categories', 'types'].map(mode => (
            <button key={mode} type="button" onClick={() => onChange({ filterMode: mode })}
              className={`py-[5px] px-[12px] rounded-[var(--radius-inner)] text-[11px] font-medium border transition-colors
                ${section.filterMode === mode ? 'bg-s2 border-bd2 text-t' : 'bg-transparent border-bd text-[#71717a] hover:text-t'}`}>
              {mode === 'categories' ? 'Category' : 'App Type'}
            </button>
          ))}
        </div>
      </div>

      {/* Category checkboxes */}
      {section.filterMode === 'categories' && (
        <div>
          <label className="block text-[11px] text-[#a1a1aa] mb-[4px] font-medium">Categories</label>
          <div className="flex flex-wrap gap-[4px]">
            {allCategories.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                className={`py-[4px] px-[10px] rounded-[var(--radius-tag)] text-[11px] font-medium border transition-colors
                  ${(section.categories || []).includes(cat)
                    ? 'bg-s3 border-bd2 text-t'
                    : 'bg-transparent border-bd text-[#71717a] hover:text-t'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Types input */}
      {section.filterMode === 'types' && (
        <div>
          <label className="block text-[11px] text-[#a1a1aa] mb-[4px] font-medium">App Types (comma separated)</label>
          <input type="text" value={(section.types || []).join(', ')}
            onChange={(e) => onChange({ types: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            className="w-full bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[6px] px-[10px] text-[12px] text-t outline-none focus:border-[rgba(255,255,255,0.2)]"
            placeholder="proxmox, unraid, linux" />
          <div className="text-[10px] text-[#a1a1aa] mt-[3px]">Must match the app type identifier exactly</div>
        </div>
      )}

      <button type="button" onClick={onClose}
        className="py-[5px] px-[14px] rounded-[var(--radius-inner)] text-[11px] font-medium bg-s2 border border-bd text-t2 hover:text-t transition-colors">
        Done
      </button>
    </div>
  );
}
