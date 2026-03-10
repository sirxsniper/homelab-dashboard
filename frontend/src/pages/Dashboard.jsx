import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllStats } from '../api/stats';
import Topbar from '../components/layout/Topbar';
import AppCard from '../components/cards/AppCard';
import AppDetailModal from '../components/modals/AppDetailModal';
import AdminModal from '../components/modals/AdminModal';
import useSSE from '../hooks/useSSE';
import { useCustomise } from '../hooks/useCustomise';

const CATEGORIES = ['All', 'Infrastructure', 'Media', 'Downloads', 'Automation', 'Network', 'Monitoring', 'Security', 'Misc'];

// Section grouping order — apps grouped by category in this order
// colKey maps to settings key for per-section column count
const SECTION_ORDER = [
  { key: 'servers', label: 'Bare Metal Servers', colKey: 'colServers', filter: s => s.type === 'proxmox' || s.type === 'unraid' || s.type === 'linux' },
  { key: 'Network', label: 'Network & Security', colKey: 'colNetwork', categories: ['Network', 'Security'] },
  { key: 'Monitoring', label: 'Monitoring', colKey: 'colMonitoring', categories: ['Monitoring'] },
  { key: 'Media', label: 'Media', colKey: 'colMedia', categories: ['Media'] },
  { key: 'Downloads', label: 'Downloads', colKey: 'colDownloads', categories: ['Downloads'] },
  { key: 'Automation', label: 'Automation', colKey: 'colAutomation', categories: ['Automation'] },
  { key: 'Infrastructure', label: 'Infrastructure', colKey: 'colInfrastructure', categories: ['Infrastructure'] },
  { key: 'Misc', label: 'Misc', colKey: 'colMisc', categories: ['Misc'] },
];

export default function Dashboard() {
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const custom = useCustomise();

  // SSE is the primary data source — delivers stats every 3s
  const sseStats = useSSE();

  // React Query is fallback only — initial load + safety net
  const { data: fetchedStats = [], isLoading: fetchLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getAllStats,
    enabled: !sseStats,  // Only fetch if SSE hasn't delivered data yet
    staleTime: Infinity,  // Never refetch once SSE is active
  });

  const stats = sseStats || fetchedStats;
  const isLoading = !sseStats && fetchLoading;

  // Live app for modal — always reads from latest stats so SSE updates flow through
  const selectedApp = useMemo(() => {
    if (!selectedAppId) return null;
    return stats.find(s => s.app_id === selectedAppId) || null;
  }, [selectedAppId, stats]);

  const filtered = useMemo(() => stats.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    return true;
  }), [stats, search, categoryFilter]);

  // Build sections from filtered apps
  const sections = useMemo(() => {
    const result = [];
    const placed = new Set();

    for (const section of SECTION_ORDER) {
      let items;
      if (section.filter) {
        items = filtered.filter(s => section.filter(s));
      } else {
        items = filtered.filter(s =>
          section.categories.includes(s.category) &&
          s.type !== 'proxmox' && s.type !== 'unraid' && s.type !== 'linux'
        );
      }
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name));
      if (items.length > 0) {
        result.push({ label: section.label, colKey: section.colKey, items });
        items.forEach(s => placed.add(s.app_id));
      }
    }

    // Catch any unplaced apps
    const remaining = filtered.filter(s => !placed.has(s.app_id)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name));
    if (remaining.length > 0) {
      result.push({ label: 'Other', colKey: 'colMisc', items: remaining });
    }

    return result;
  }, [filtered]);

  return (
    <div className={`min-h-screen ${custom.bgImage ? '' : 'bg-bg'}`}>
      <Topbar onAdminClick={() => setShowAdmin(true)} stats={stats} />

      {/* Content */}
      <div className="py-[24px] px-[22px] max-w-[1920px] mx-auto">
        {/* Toolbar */}
        <div className="flex gap-[8px] mb-[22px] flex-wrap items-center toolbar-wrap rounded-[var(--radius-card)] px-[14px] py-[10px] bg-s1/70 backdrop-blur-md border border-bd">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-t3 text-[13px] pointer-events-none">&#x2315;</span>
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[8px] pr-[13px] pl-[34px] text-[13px] text-t w-[210px] outline-none focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] transition-colors"
            />
          </div>

          {/* Category pills */}
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`py-[6px] px-[12px] rounded-[var(--radius-inner)] text-[12px] font-medium border transition-colors
                ${categoryFilter === cat
                  ? 'bg-s3 border-bd2 text-t'
                  : 'bg-s2 border-bd text-t2 hover:text-t hover:border-bd2'
                }`}
            >
              {cat}
            </button>
          ))}

          {/* Count */}
          <span className="ml-auto text-[12px] text-t3 font-mono">
            {filtered.length} app{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-[60px]">
            <div className="w-[20px] h-[20px] border-2 border-t3 border-t-t rounded-full animate-spin" />
            <div className="text-[13px] text-t3 mt-[12px]">Loading dashboard...</div>
          </div>
        )}

        {/* Card grid — grouped by section, each section has its own column count */}
        {!isLoading && sections.length > 0 && sections.map((section, sIdx) => {
          const cols = custom[section.colKey] || 3;
          return (
            <div key={section.label}>
              <div className={`flex items-center pb-[14px] pl-[2px] ${sIdx > 0 ? 'mt-[38px]' : ''}`}>
                <span className="section-title">{section.label}</span>
                <div className="section-title-line" />
              </div>
              <div
                className="grid gap-[14px] items-start section-grid"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {section.items.map((app, i) => (
                  <AppCard key={app.app_id} app={app} index={i} onClick={() => setSelectedAppId(app.app_id)} cols={cols} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-[60px] text-t3">
            <div className="text-[32px] mb-[8px]">&#128421;</div>
            <div className="text-[13px]">
              {stats.length === 0 ? 'No apps configured yet' : 'No apps match your filters'}
            </div>
            {stats.length === 0 && (
              <button
                onClick={() => setShowAdmin(true)}
                className="mt-[16px] py-[9px] px-[20px] bg-t text-bg rounded-[var(--radius-inner)] text-[13px] font-semibold hover:opacity-88 transition-opacity"
              >
                Add Your First App
              </button>
            )}
          </div>
        )}
      </div>

      {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedAppId(null)} />}
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
