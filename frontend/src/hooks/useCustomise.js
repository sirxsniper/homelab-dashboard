import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

const HL_KEY = 'hl_custom';
const EVENT = 'hl_custom_changed';

/* ── Default section definitions ── */
export const DEFAULT_SECTIONS = [
  { key: 'servers', label: 'Bare Metal Servers', filterMode: 'types', types: ['proxmox', 'unraid', 'linux'], categories: [], colCount: 3 },
  { key: 'Network', label: 'Network & Security', filterMode: 'categories', types: [], categories: ['Network', 'Security'], colCount: 3 },
  { key: 'Monitoring', label: 'Monitoring', filterMode: 'categories', types: [], categories: ['Monitoring'], colCount: 3 },
  { key: 'Media', label: 'Media', filterMode: 'categories', types: [], categories: ['Media'], colCount: 3 },
  { key: 'Downloads', label: 'Downloads', filterMode: 'categories', types: [], categories: ['Downloads'], colCount: 3 },
  { key: 'Automation', label: 'Automation', filterMode: 'categories', types: [], categories: ['Automation'], colCount: 3 },
  { key: 'Infrastructure', label: 'Infrastructure', filterMode: 'categories', types: [], categories: ['Infrastructure'], colCount: 3 },
  { key: 'Misc', label: 'Misc', filterMode: 'categories', types: [], categories: ['Misc'], colCount: 3 },
];

const LEGACY_COL_MAP = {
  servers: 'colServers', Network: 'colNetwork', Monitoring: 'colMonitoring',
  Media: 'colMedia', Downloads: 'colDownloads', Automation: 'colAutomation',
  Infrastructure: 'colInfrastructure', Misc: 'colMisc',
};

/** Get sections array — custom or defaults with legacy column overrides */
export function getSections(settings) {
  if (Array.isArray(settings.sections) && settings.sections.length > 0) return settings.sections;
  return DEFAULT_SECTIONS.map(s => ({
    ...s,
    colCount: settings[LEGACY_COL_MAP[s.key]] ?? s.colCount,
  }));
}

const BASE_CATEGORIES = ['Infrastructure', 'Media', 'Downloads', 'Automation', 'Network', 'Monitoring', 'Security', 'Misc', 'Other'];

/** Get all categories — base + any custom ones from sections (categories + labels) */
export function getAllCategories(settings) {
  const secs = getSections(settings);
  const all = [...BASE_CATEGORIES];
  for (const s of secs) {
    // Add categories from category-mode sections
    for (const c of (s.categories || [])) {
      if (c && !all.includes(c)) all.push(c);
    }
    // Also add the section label itself as a category (users expect this)
    if (s.label && !all.includes(s.label)) all.push(s.label);
  }
  return all;
}

/* ── Default values (match global.css) ── */
export const DEFAULTS = {
  // Dashboard
  name: '',
  logo: '',
  bgColour: '#0a0a0c',
  bgImage: '',

  // Surface colours
  cardBg: '#0f0f11',
  cardBg2: '#161618',
  cardBg3: '#1c1c1f',
  borderColour: 'rgba(255,255,255,0.07)',
  borderColour2: 'rgba(255,255,255,0.13)',

  // Text colours
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  textTertiary: '#3f3f46',

  // Category accent colours
  accentInfra: '#60a5fa',
  accentMedia: '#a78bfa',
  accentNetwork: '#34d399',
  accentMonitoring: '#fb923c',
  accentSecurity: '#f87171',
  accentDownloads: '#f59e0b',
  accentAutomation: '#60a5fa',
  accentMisc: '#34d399',

  // Status colours
  statusOnline: '#22c55e',
  statusWarning: '#f59e0b',
  statusOffline: '#ef4444',

  // Graph / chart colours
  graphCpu: '#a78bfa',
  graphRam: '#60a5fa',
  graphTemp: '#f59e0b',
  graphDocker: '#60a5fa',
  graphUpload: '#60a5fa',
  graphDownload: '#22c55e',
  graphGeneric: '#34d399',

  // Card sparkline colours
  sparkCpu: '#60a5fa',
  sparkRam: '#a78bfa',

  // Section columns (cards per row)  — keys match SECTION_ORDER keys
  colServers: 3,
  colNetwork: 3,
  colMonitoring: 3,
  colMedia: 3,
  colDownloads: 3,
  colAutomation: 3,
  colInfrastructure: 3,
  colMisc: 3,

  // Card radius
  cardRadius: 14,
  innerRadius: 8,

  // Weather widget
  weatherApiKey: '',
  weatherLocation: '',
  weatherUnits: 'metric',

  // Sections (null = use built-in defaults)
  sections: null,
};

/* ── CSS variable mapping ── */
const CSS_MAP = {
  bgColour: '--color-bg',
  cardBg: '--color-s1',
  cardBg2: '--color-s2',
  cardBg3: '--color-s3',
  borderColour: '--color-bd',
  borderColour2: '--color-bd2',
  textPrimary: '--color-t',
  textSecondary: '--color-t2',
  textTertiary: '--color-t3',
  accentInfra: '--color-infra',
  accentMedia: '--color-media',
  accentNetwork: '--color-network',
  accentMonitoring: '--color-monitoring',
  accentSecurity: '--color-security',
  accentDownloads: '--color-downloads',
  accentAutomation: '--color-automation',
  accentMisc: '--color-misc',
  statusOnline: '--color-green',
  statusWarning: '--color-amber',
  statusOffline: '--color-red',
  sparkCpu: '--spark-cpu',
  sparkRam: '--spark-ram',
  graphCpu: '--graph-cpu',
  graphRam: '--graph-ram',
  graphTemp: '--graph-temp',
  graphDocker: '--graph-docker',
  graphUpload: '--graph-upload',
  graphDownload: '--graph-download',
  graphGeneric: '--graph-generic',
  cardRadius: '--radius-card',
  innerRadius: '--radius-inner',
};

/* ── Read from localStorage ── */
function loadSettings() {
  try {
    const raw = localStorage.getItem(HL_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

/* ── Apply all CSS variables ── */
export function applyCssVars(settings) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_MAP)) {
    const val = settings[key] ?? DEFAULTS[key];
    if (key === 'cardRadius' || key === 'innerRadius') {
      root.style.setProperty(cssVar, `${val}px`);
    } else {
      root.style.setProperty(cssVar, val);
    }
  }

  // Background image
  if (settings.bgImage) {
    document.body.style.backgroundImage = `url(${settings.bgImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundAttachment = '';
  }

  // Dashboard name
  if (settings.name) {
    document.title = settings.name + ' Dashboard';
  } else {
    document.title = 'Homelab Dashboard';
  }
}

/* ── External store for useSyncExternalStore ── */
let _snapshot = loadSettings();
let _snapshotJson = JSON.stringify(_snapshot);
const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() { return _snapshot; }

function notify() {
  const newSnapshot = loadSettings();
  const newJson = JSON.stringify(newSnapshot);
  if (newJson === _snapshotJson) return;
  _snapshot = newSnapshot;
  _snapshotJson = newJson;
  listeners.forEach(cb => cb());
}

// Listen for cross-component events
if (typeof window !== 'undefined') {
  window.addEventListener(EVENT, notify);
  window.addEventListener('storage', (e) => { if (e.key === HL_KEY) notify(); });
}

/* ── Hook: read settings reactively ── */
export function useCustomise() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/* ── Hook: update a single setting ── */
export function useCustomiseUpdate() {
  return useCallback((key, value) => {
    const current = loadSettings();
    current[key] = value;

    // Clean up defaults to save space
    const toStore = {};
    for (const [k, v] of Object.entries(current)) {
      if (v !== DEFAULTS[k]) toStore[k] = v;
    }
    if (Object.keys(toStore).length === 0) {
      localStorage.removeItem(HL_KEY);
    } else {
      try {
        localStorage.setItem(HL_KEY, JSON.stringify(toStore));
      } catch (err) {
        // Quota exceeded — rethrow so callers can handle it
        throw new Error('STORAGE_FULL');
      }
    }

    applyCssVars(current);
    window.dispatchEvent(new Event(EVENT));
    window.dispatchEvent(new Event('hl_name_changed'));
  }, []);
}

/* ── Bulk reset ── */
export function resetAllCustomisation() {
  localStorage.removeItem(HL_KEY);
  // Also clean up legacy keys
  localStorage.removeItem('hl_name');
  localStorage.removeItem('hl_bg_colour');
  localStorage.removeItem('hl_bg_image');
  applyCssVars(DEFAULTS);
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new Event('hl_name_changed'));
}

/* ── Get graph colour for a chart key ── */
export function getGraphColor(key, settings) {
  const map = {
    cpu_usage: settings?.graphCpu || DEFAULTS.graphCpu,
    ram_usage: settings?.graphRam || DEFAULTS.graphRam,
    cpu_temp: settings?.graphTemp || DEFAULTS.graphTemp,
    gpu_usage: settings?.graphCpu || DEFAULTS.graphCpu,
    gpu_temp: settings?.graphTemp || DEFAULTS.graphTemp,
    docker_running: settings?.graphDocker || DEFAULTS.graphDocker,
    upload_mbps: settings?.graphUpload || DEFAULTS.graphUpload,
    download_mbps: settings?.graphDownload || DEFAULTS.graphDownload,
    up: settings?.statusOnline || DEFAULTS.statusOnline,
    down: settings?.statusOffline || DEFAULTS.statusOffline,
  };
  return map[key] || settings?.graphGeneric || DEFAULTS.graphGeneric;
}
