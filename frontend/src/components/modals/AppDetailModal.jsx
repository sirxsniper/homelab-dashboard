import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAppHistory, fetchCalendar } from '../../api/stats';
import StatusPill from '../ui/StatusPill';
import StatBox, { StatRow } from '../ui/StatBox';
import ProgressBar from '../ui/ProgressBar';
import { ItemList, ItemRow } from '../ui/ItemList';
import StreamRow from '../ui/StreamRow';
import CalendarGrid from '../ui/CalendarGrid';
import { fmt, fmtPct, fmtGb, fmtMs, fmtSpeed } from '../../utils/fmt';
import { useCustomise, getGraphColor } from '../../hooks/useCustomise';

/* ── Calendar tab wrappers ── */

function SonarrCalendarTab({ appId }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    fetchCalendar(appId, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
      .then(data => { setEpisodes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appId]);

  if (loading) return <div className="flex justify-center py-[24px]"><div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" /></div>;

  return <CalendarGrid episodes={episodes} type="sonarr" />;
}

function RadarrCalendarTab({ appId }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    fetchCalendar(appId, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
      .then(data => { setEpisodes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appId]);

  if (loading) return <div className="flex justify-center py-[24px]"><div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" /></div>;

  return <CalendarGrid episodes={episodes} type="radarr" />;
}

/* ── Per-type detail renderers ── */

function JellyfinDetail({ data }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.recently_added?.length > 0 ? [{ key: 'recent', label: 'Recently Added' }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Movies" value={data.movies} />
            <StatBox label="Series" value={data.series} />
            <StatBox label="Episodes" value={data.episodes?.toLocaleString()} />
          </StatRow>
          <StatRow>
            <StatBox label="Songs" value={data.songs} />
            <StatBox label="Streams" value={data.active_streams} />
            {data.version && <StatBox label="Version" value={data.version} small truncate />}
          </StatRow>
          {data.streams?.length > 0 && (
            <>
              <div className="section-label">Now Playing</div>
              {data.streams.map((s, i) => (
                <StreamRow key={i} title={`${s.user} · ${s.title} ${s.year ? `(${s.year})` : ''}`}
                  sub={[s.type, s.play_method, s.transcoding ? 'transcoding' : null].filter(Boolean).join(' · ')} />
              ))}
            </>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Recently Added</div>
          <ItemList>
            {data.recently_added.map((item, i) => (
              <ItemRow key={i} name={item.title}
                sub={item.subtitle}
                tag={item.type}
                value={item.year || ''} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function PlexDetail({ data }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.recently_added?.length > 0 ? [{ key: 'recent', label: 'Recently Added' }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Movies" value={data.movies} />
            <StatBox label="TV Shows" value={data.shows} />
            <StatBox label="Albums" value={data.albums} />
          </StatRow>
          <StatRow>
            <StatBox label="Libraries" value={data.libraries} />
            <StatBox label="Streams" value={data.active_streams} />
            {data.version && <StatBox label="Version" value={data.version} small truncate />}
          </StatRow>
          {data.streams?.length > 0 && (
            <>
              <div className="section-label">Now Playing</div>
              {data.streams.map((s, i) => (
                <StreamRow key={i} title={`${s.user} · ${s.title}`}
                  sub={[s.quality, s.play_method].filter(Boolean).join(' · ')} />
              ))}
            </>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Recently Added</div>
          <ItemList>
            {data.recently_added.map((item, i) => (
              <ItemRow key={i} name={item.title}
                sub={item.subtitle}
                tag={item.type}
                value={item.year || ''} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function ProxmoxDetail({ data }) {
  const [tab, setTab] = useState('overview');

  const allGuests = [];
  if (data.nodes) {
    for (const node of data.nodes) {
      for (const vm of (node.vms || [])) allGuests.push({ ...vm, tag: 'VM' });
      for (const lxc of (node.lxcs || [])) allGuests.push({ ...lxc, tag: 'LXC' });
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(allGuests.length > 0 ? [{ key: 'guests', label: `Guests (${allGuests.length})` }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="VMs" value={`${data.running_vms || 0} / ${data.total_vms || 0}`} />
            <StatBox label="LXCs" value={`${data.running_lxcs || 0} / ${data.total_lxcs || 0}`} />
            {data.version && <StatBox label="Version" value={data.version} small truncate />}
          </StatRow>
          <div className="mt-[8px]">
            <ProgressBar label="CPU Usage" pct={data.cpu || 0} />
            <ProgressBar label={`RAM (${fmtGb(data.ram?.used)} / ${fmtGb(data.ram?.total)})`}
              pct={data.ram?.total ? (data.ram.used / data.ram.total * 100) : 0} />
          </div>
          {data.gpus?.filter(g => g.power_draw > 0 || g.freq_mhz > 0).length > 0 && (
            <>
              <div className="section-label">GPU</div>
              {data.gpus.filter(g => g.power_draw > 0 || g.freq_mhz > 0).map((gpu, i) => (
                <div key={i}>
                  <StatRow>
                    <StatBox label="Model" value={gpu.name} small truncate />
                    <StatBox label="Temp" value={`${gpu.temp || 0}°C`} small />
                    <StatBox label="Freq" value={gpu.freq_mhz ? `${gpu.freq_mhz} MHz` : 'N/A'} small />
                  </StatRow>
                  <StatRow>
                    {gpu.power_draw != null && <StatBox label="Power" value={`${gpu.power_draw}W`} small />}
                    {gpu.fan_rpm != null && <StatBox label="Fan" value={`${gpu.fan_rpm} RPM`} small />}
                    {gpu.vram_total_mb != null && (
                      <StatBox label="VRAM" value={`${((gpu.vram_used_mb || 0) / 1024).toFixed(1)} / ${(gpu.vram_total_mb / 1024).toFixed(0)} GB`} small />
                    )}
                  </StatRow>
                </div>
              ))}
            </>
          )}
          {data.storages?.length > 0 && (
            <>
              <div className="section-label">Storage</div>
              <ItemList>
                {data.storages.map((s, i) => (
                  <ItemRow key={i} name={s.name} tag={s.type}
                    dot={s.active ? 'green' : 'red'}
                    value={s.total_gb > 0 ? `${s.used_gb} / ${s.total_gb} GB (${s.use_pct}%)` : 'N/A'}
                    valueColor={s.use_pct > 85 ? 'red' : s.use_pct > 70 ? 'amber' : undefined} />
                ))}
              </ItemList>
            </>
          )}
        </>
      )}

      {tab === 'guests' && (
        <>
          {allGuests.filter(g => g.tag === 'VM').length > 0 && (
            <>
              <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Virtual Machines</div>
              <ItemList>
                {allGuests.filter(g => g.tag === 'VM').map((g, i) => (
                  <ItemRow key={i} name={g.name} tag="VM"
                    dot={g.status === 'running' ? 'green' : 'red'}
                    value={g.status} valueColor={g.status === 'running' ? undefined : 'red'} />
                ))}
              </ItemList>
            </>
          )}
          {allGuests.filter(g => g.tag === 'LXC').length > 0 && (
            <>
              <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px] mt-[16px]">LXC Containers</div>
              <ItemList>
                {allGuests.filter(g => g.tag === 'LXC').map((g, i) => (
                  <ItemRow key={i} name={g.name} tag="LXC"
                    dot={g.status === 'running' ? 'green' : 'red'}
                    value={g.status} valueColor={g.status === 'running' ? undefined : 'red'} />
                ))}
              </ItemList>
            </>
          )}
        </>
      )}
    </>
  );
}

function AdguardDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Queries" value={data.dns_queries?.toLocaleString()} />
        <StatBox label="Blocked" value={data.blocked_queries?.toLocaleString()} />
        <StatBox label="Blocked %" value={`${data.blocked_percentage}%`} />
      </StatRow>
      <StatRow>
        <StatBox label="Latency" value={`${data.avg_processing_time} ms`} small />
        <StatBox label="Rules" value={data.rules_count?.toLocaleString()} small />
        <StatBox label="Filtering" value={data.filtering_enabled ? 'On' : 'Off'} small />
      </StatRow>
    </>
  );
}

function PiholeDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Queries" value={data.dns_queries?.toLocaleString()} />
        <StatBox label="Blocked" value={data.blocked_queries?.toLocaleString()} />
        <StatBox label="Blocked %" value={`${data.blocked_percentage?.toFixed(1)}%`} />
      </StatRow>
      <StatRow>
        <StatBox label="Blocklist" value={data.domains_on_blocklist?.toLocaleString()} small />
        <StatBox label="Unique" value={data.unique_domains?.toLocaleString()} small />
        <StatBox label="Clients" value={data.clients_seen} small />
      </StatRow>
    </>
  );
}

function UptimeKumaDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Total" value={data.total_monitors} />
        <StatBox label="Up" value={data.up} />
        <StatBox label="Down" value={data.down} />
      </StatRow>
      {data.monitors?.length > 0 && (
        <>
          <div className="section-label">Monitors</div>
          <ItemList>
            {data.monitors.map((m, i) => (
              <ItemRow key={i} name={m.name}
                dot={m.status === 'up' ? 'green' : 'red'}
                value={m.latency > 0 ? `${m.latency}ms` : '\u2014'}
                valueColor={m.status === 'up' ? undefined : 'red'} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function PortainerDetail({ data }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.container_list?.length > 0 ? [{ key: 'containers', label: `Containers (${data.container_list.length})` }] : []),
    ...(data.stack_list?.length > 0 ? [{ key: 'stacks', label: `Stacks (${data.stack_list.length})` }] : []),
  ];

  const fmtUptime = (ms) => {
    if (!ms) return null;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Running" value={data.running || 0} />
            <StatBox label="Stopped" value={data.stopped || 0} valueColor={data.stopped > 0 ? 'red' : undefined} />
            <StatBox label="Stacks" value={data.stacks || 0} />
            <StatBox label="Environments" value={data.environments || 0} />
          </StatRow>
          <StatRow>
            <StatBox label="Images" value={data.images || 0} small />
            {data.image_size && <StatBox label="Image Size" value={data.image_size} small />}
            <StatBox label="Volumes" value={data.volumes || 0} small />
            {data.networks > 0 && <StatBox label="Networks" value={data.networks} small />}
          </StatRow>
          {data.docker_version && (
            <StatRow>
              <StatBox label="Docker" value={data.docker_version} small />
              {data.response_time && <StatBox label="Response" value={`${data.response_time}ms`} small />}
            </StatRow>
          )}
        </>
      )}

      {tab === 'containers' && (
        <ItemList>
          {data.container_list.map((c, i) => (
            <ItemRow key={i}
              name={c.name}
              sub={[c.status, c.ports?.length > 0 ? c.ports.join(', ') : null, fmtUptime(c.uptime)].filter(Boolean).join(' · ') || null}
              dot={c.state === 'running' ? 'green' : 'red'}
              value={c.image.split('/').pop().split(':')[0]}
            />
          ))}
        </ItemList>
      )}

      {tab === 'stacks' && (
        <ItemList>
          {data.stack_list.map((s, i) => (
            <ItemRow key={i}
              name={s.name}
              sub={s.type}
              dot={s.status === 'active' ? 'green' : 'red'}
              value={s.status}
            />
          ))}
        </ItemList>
      )}
    </>
  );
}

function NginxProxyDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Proxies" value={data.proxy_hosts} />
        <StatBox label="SSL" value={data.ssl_hosts} />
        <StatBox label="Certs" value={data.certificates} />
      </StatRow>
      {data.hosts?.length > 0 && (
        <>
          <div className="section-label">Hosts</div>
          <ItemList>
            {data.hosts.map((h, i) => (
              <ItemRow key={i} name={h.domain}
                tag={h.ssl ? 'SSL' : undefined}
                dot={h.enabled ? 'green' : 'red'}
                value={h.enabled ? 'Active' : 'Disabled'}
                valueColor={h.enabled ? undefined : 'red'} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function GrafanaDetail({ data }) {
  return (
    <StatRow>
      <StatBox label="Boards" value={data.dashboards} />
      <StatBox label="Sources" value={data.datasources} />
      <StatBox label="Alerts" value={data.firing_alerts} />
      {data.version && <StatBox label="Version" value={data.version} small truncate />}
    </StatRow>
  );
}

function UnraidDetail({ data }) {
  const [tab, setTab] = useState('overview');

  if (!data.docker_total && data.response_time != null) return <GenericDetail data={data} />;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.containers?.length > 0 ? [{ key: 'containers', label: `Containers (${data.containers.length})` }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="CPU" value={`${data.cpu_usage || 0}%`} />
            <StatBox label="RAM" value={`${data.ram_usage || 0}%`} />
            <StatBox label="Docker" value={`${data.docker_running || 0} / ${data.docker_total || 0}`} />
          </StatRow>
          <StatRow>
            {data.cpu_temp != null && <StatBox label="Temp" value={`${data.cpu_temp}°C`} small />}
            {data.cpu_power != null && <StatBox label="Power" value={`${data.cpu_power}W`} small />}
            <StatBox label="Array" value={data.array_state || 'N/A'} small />
          </StatRow>

          <div className="section-label">Hardware</div>
          <StatRow>
            <StatBox label="CPU" value={data.cpu_model || 'N/A'} small truncate />
            <StatBox label="Cores" value={`${data.cpu_cores || 0} / ${data.cpu_threads || 0}`} small />
          </StatRow>
          <StatRow>
            <StatBox label="RAM Total" value={`${data.ram_total_gb || 0} GB`} small />
            <StatBox label="RAM Used" value={`${data.ram_used_gb || 0} GB`} small />
            <StatBox label="RAM Free" value={`${data.ram_free_gb || 0} GB`} small />
          </StatRow>

          {data.gpu && (
            <>
              <div className="section-label">GPU</div>
              <StatRow>
                <StatBox label="Model" value={data.gpu.name} small truncate />
                <StatBox label="Usage" value={`${data.gpu.usage || 0}%`} small />
                <StatBox label="Temp" value={`${data.gpu.temp || 0}°C`} small />
              </StatRow>
              <StatRow>
                <StatBox label="VRAM" value={`${((data.gpu.vram_used_mb || 0) / 1024).toFixed(1)} / ${((data.gpu.vram_total_mb || 0) / 1024).toFixed(0)} GB`} small />
                <StatBox label="Power" value={`${data.gpu.power_draw || 0} / ${data.gpu.power_limit || 0}W`} small />
                <StatBox label="Driver" value={data.gpu.driver_version || 'N/A'} small truncate />
              </StatRow>
            </>
          )}

          <div className="section-label">Storage</div>
          <StatRow>
            <StatBox label="Usable" value={`${data.total_usable_tb || 0} TB`} small />
            <StatBox label="Used" value={`${data.total_used_tb || 0} TB`} small />
            <StatBox label="Free" value={`${data.total_free_tb || 0} TB`} small />
          </StatRow>
          <div className="flex gap-[12px] text-[11px] text-t3 font-mono mb-[8px]">
            <span>HDD {data.disks_hd || 0}</span>
            <span>SSD {data.disks_ssd || 0}</span>
            <span>NVMe {data.disks_nvme || 0}</span>
          </div>

          {data.pools?.length > 0 && (
            <>
              <div className="section-label">Pools</div>
              <ItemList>
                {data.pools.map((p, i) => (
                  <ItemRow key={i} name={`${p.name} (${p.usePct}%)`} tag={`${p.disks} disks`}
                    dot={p.healthy ? 'green' : 'red'}
                    value={`${p.usedTB} / ${p.totalTB} TB`} />
                ))}
              </ItemList>
            </>
          )}
          {data.drive_temps?.length > 0 && (
            <>
              <div className="section-label">Drive Temps</div>
              <ItemList>
                {data.drive_temps.map((d, i) => (
                  <ItemRow key={i} name={d.name} tag={d.type}
                    dot={d.temp > 50 ? 'red' : d.temp > 40 ? 'amber' : 'green'}
                    value={`${d.temp}°C`} valueColor={d.temp > 50 ? 'red' : d.temp > 40 ? 'amber' : undefined} />
                ))}
              </ItemList>
            </>
          )}
        </>
      )}

      {tab === 'containers' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">All Containers</div>
          <ItemList>
            {data.containers.map((c, i) => (
              <ItemRow key={i} name={c.name}
                dot={c.state === 'RUNNING' ? 'green' : 'red'}
                value={c.state === 'RUNNING' ? 'running' : 'stopped'}
                valueColor={c.state === 'RUNNING' ? undefined : 'red'} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function VaultwardenDetail({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} small />
      {data.response_time != null && <StatBox label="Response" value={`${data.response_time}ms`} small />}
      {data.version && <StatBox label="Version" value={data.version} small truncate />}
    </StatRow>
  );
}

function NotifiarrDetail({ data }) {
  const [tab, setTab] = useState('overview');

  const fmtUptime = (s) => {
    if (!s) return '—';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
  };

  const fmtSince = (iso) => {
    if (!iso || iso.startsWith('0001')) return null;
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.services?.length > 0 ? [{ key: 'services', label: 'Service Checks' }] : []),
    ...(data.apps?.length > 0 ? [{ key: 'apps', label: 'Integrations' }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Integrations" value={data.integrations_total || 0} />
            <StatBox label="Service Checks" value={data.services_total || 0} />
            <StatBox label="Healthy" value={data.services_up || 0} />
            <StatBox label="Down" value={data.services_down || 0} valueColor={data.services_down > 0 ? 'red' : undefined} />
          </StatRow>
          <StatRow>
            <StatBox label="Uptime" value={fmtUptime(data.uptime)} />
            {data.version && <StatBox label="Version" value={data.version} small />}
            <StatBox label="Response" value={`${data.response_time || 0}ms`} small />
          </StatRow>
          {data.host && (
            <>
              <div className="section-label mt-[12px]">Host</div>
              <StatRow>
                <StatBox label="Hostname" value={data.host.hostname || '—'} small truncate />
                <StatBox label="Platform" value={data.host.os || '—'} small />
                <StatBox label="Arch" value={data.host.arch || '—'} small />
                {data.host.docker && <StatBox label="Docker" value="Yes" small />}
              </StatRow>
            </>
          )}
          {data.integrations && Object.keys(data.integrations).length > 0 && (
            <>
              <div className="section-label mt-[12px]">Connected Apps</div>
              <div className="flex flex-wrap gap-[6px]">
                {Object.entries(data.integrations).map(([name, count]) => (
                  <span key={name} className="text-[11px] px-[8px] py-[3px] rounded-[var(--radius-tag)] bg-s2 border border-bd text-t2 font-medium capitalize">
                    {name} <span className="text-t3 font-mono ml-[2px]">×{count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'services' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Service Health Checks</div>
          <ItemList>
            {data.services.map((svc, i) => (
              <ItemRow key={i}
                name={svc.name}
                sub={svc.output ? `${svc.output}${fmtSince(svc.since) ? ` · up since ${fmtSince(svc.since)}` : ''}` : null}
                dot={svc.state === 'ok' ? 'green' : 'red'}
                value={svc.state === 'ok' ? 'OK' : 'DOWN'}
                valueColor={svc.state === 'ok' ? undefined : 'red'}
              />
            ))}
          </ItemList>
        </>
      )}

      {tab === 'apps' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Integrated Applications</div>
          <ItemList>
            {data.apps.map((app, i) => (
              <ItemRow key={i}
                name={app.name}
                tag={app.type}
                dot={app.up ? 'green' : 'red'}
                value={app.version || (app.up ? 'Online' : 'Offline')}
                valueColor={app.up ? undefined : 'red'}
              />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function Iperf3Detail({ data }) {
  const fmtSpeed = (mbps) => {
    if (mbps == null) return '—';
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gb/s`;
    return `${mbps.toFixed(1)} Mb/s`;
  };

  if (!data.upload_mbps && !data.download_mbps) {
    return (
      <StatRow>
        <StatBox label="Status" value={data.status || 'unknown'} small />
        <StatBox label="Port" value={data.port || 5201} small />
        {data.busy && <StatBox label="Note" value="Server busy" small />}
      </StatRow>
    );
  }

  return (
    <div className="space-y-[12px]">
      <StatRow>
        <StatBox label="Upload" value={fmtSpeed(data.upload_mbps)} accent />
        <StatBox label="Download" value={fmtSpeed(data.download_mbps)} />
        <StatBox label="Retransmits" value={data.retransmits ?? '—'} small />
        <StatBox label="Port" value={data.port || 5201} small />
      </StatRow>
      {data.tested_at && (
        <div className="text-[11px] text-t4 text-right">
          Last tested: {new Date(data.tested_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

const seerrStatusColor = { Pending: 'text-amber', Approved: 'text-green', Declined: 'text-red', Processing: 'text-blue' };

function SeerrRequestRow({ r }) {
  return (
    <div className="ir flex items-center gap-[10px] py-[8px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
      {r.poster && (
        <img src={`https://image.tmdb.org/t/p/w92${r.poster}`} alt=""
          className="w-[32px] h-[48px] rounded-[4px] object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-t font-medium truncate leading-tight">{r.title}</div>
        <div className="flex items-center gap-[6px] mt-[3px] flex-wrap">
          <span className="text-[10px] text-t3">{r.type}{r.is4k ? ' · 4K' : ''}</span>
          <span className={`text-[10px] font-semibold ${seerrStatusColor[r.request_status] || 'text-t3'}`}>{r.request_status}</span>
          {r.media_status && r.media_status !== 'Unknown' && (
            <span className="text-[10px] text-t4">({r.media_status})</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] text-t2 truncate max-w-[100px]">{r.user}</div>
        <div className="text-[10px] text-t4 font-mono">{r.time_ago}</div>
      </div>
    </div>
  );
}

function SeerrDetail({ data }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'recent', label: 'Recent' },
    ...(data.pending?.length > 0 ? [{ key: 'pending', label: `Pending (${data.pending_count || 0})` }] : []),
    ...(data.top_users?.length > 0 ? [{ key: 'users', label: 'Top Users' }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px] flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Total Requests" value={data.total_requests || 0} accent />
            <StatBox label="Media Items" value={fmt(data.total_media || 0)} />
          </StatRow>
          <StatRow>
            <StatBox label="Pending" value={<span className={data.pending_count > 0 ? 'text-amber' : ''}>{data.pending_count || 0}</span>} small />
            <StatBox label="Approved" value={data.approved_count || 0} small />
            <StatBox label="Processing" value={data.processing_count || 0} small />
            <StatBox label="Available" value={data.available_count || 0} small />
          </StatRow>
          {data.declined_count > 0 && (
            <StatRow>
              <StatBox label="Declined" value={<span className="text-red">{data.declined_count}</span>} small />
              {data.version && <StatBox label="Version" value={data.version} small truncate />}
            </StatRow>
          )}
          {!data.declined_count && data.version && (
            <StatRow>
              <StatBox label="Version" value={data.version} small truncate />
            </StatRow>
          )}
          {data.update_available && (
            <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] text-amber rounded-[var(--radius-inner)] px-[12px] py-[8px] text-[12px] mt-[8px]">
              Update available{data.commits_behind > 0 ? ` (${data.commits_behind} commits behind)` : ''}
            </div>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Recent Requests</div>
          {data.recent?.length > 0 ? (
            <div className="flex flex-col gap-[4px]">
              {data.recent.map((r, i) => <SeerrRequestRow key={r.id || i} r={r} />)}
            </div>
          ) : (
            <div className="text-[12px] text-t3 text-center py-[20px]">No recent requests</div>
          )}
        </>
      )}

      {tab === 'pending' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Pending Approval</div>
          {data.pending?.length > 0 ? (
            <div className="flex flex-col gap-[4px]">
              {data.pending.map((r, i) => <SeerrRequestRow key={r.id || i} r={r} />)}
            </div>
          ) : (
            <div className="text-[12px] text-t3 text-center py-[20px]">No pending requests</div>
          )}
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">Top Requesters</div>
          <div className="flex flex-col gap-[4px]">
            {data.top_users?.map((u, i) => (
              <div key={i} className="ir flex items-center gap-[10px] py-[8px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                {u.avatar && (
                  <img src={u.avatar} alt="" className="w-[28px] h-[28px] rounded-full object-cover shrink-0" />
                )}
                <span className="text-[13px] text-t flex-1 truncate">{u.name}</span>
                <span className="text-[12px] font-mono text-t2 shrink-0">{u.requests} req{u.requests !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function GenericDetail({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} small />
      {data.response_time != null && <StatBox label="Response" value={fmtMs(data.response_time)} small />}
      {data.http_status && <StatBox label="HTTP" value={data.http_status} small />}
    </StatRow>
  );
}

const fmtUptime = (s) => { if (!s) return '—'; const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };

function SonarrDetail({ data, appId }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'calendar', label: 'Calendar' },
    ...(data.queue?.length > 0 ? [{ key: 'queue', label: `Queue (${data.queue_count || 0})` }] : []),
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Series" value={data.series} />
            <StatBox label="Episodes" value={fmt(data.episodes)} />
            <StatBox label="Missing" value={data.missing} />
          </StatRow>
          <StatRow>
            <StatBox label="Monitored" value={data.monitored} small />
            <StatBox label="Unmonitored" value={data.unmonitored} small muted />
            <StatBox label="Queue" value={data.queue_count} small />
            {data.version && <StatBox label="Version" value={data.version} small truncate />}
          </StatRow>
        </>
      )}

      {tab === 'calendar' && (
        <SonarrCalendarTab appId={appId} />
      )}

      {tab === 'queue' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">
            Active Downloads
          </div>
          {data.queue?.length > 0 ? (
            <ItemList>{data.queue.map((q, i) => (
              <ItemRow key={i} name={q.title} value={q.timeleft || `${q.progress?.toFixed(0)}%`} />
            ))}</ItemList>
          ) : (
            <div className="text-[12px] text-t3 text-center py-[20px]">Queue empty</div>
          )}
        </>
      )}
    </>
  );
}

function RadarrDetail({ data, appId }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'calendar', label: 'Calendar' },
    ...(data.queue?.length > 0 ? [{ key: 'queue', label: `Queue (${data.queue_count || 0})` }] : []),
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Movies" value={data.movies} />
            <StatBox label="Missing" value={data.missing} />
            <StatBox label="Queue" value={data.queue_count} />
          </StatRow>
          <StatRow>
            <StatBox label="Monitored" value={data.monitored} small />
            <StatBox label="Unmonitored" value={data.unmonitored} small muted />
            <StatBox label="Disk" value={data.size_on_disk ? `${data.size_on_disk} GB` : '---'} small />
            {data.version && <StatBox label="Version" value={data.version} small truncate />}
          </StatRow>
        </>
      )}

      {tab === 'calendar' && (
        <RadarrCalendarTab appId={appId} />
      )}

      {tab === 'queue' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">
            Active Downloads
          </div>
          {data.queue?.length > 0 ? (
            <ItemList>{data.queue.map((q, i) => (
              <ItemRow key={i} name={q.title} value={q.timeleft || `${q.progress?.toFixed(0)}%`} />
            ))}</ItemList>
          ) : (
            <div className="text-[12px] text-t3 text-center py-[20px]">Queue empty</div>
          )}
        </>
      )}
    </>
  );
}

function BazarrDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Wanted Series" value={data.wanted_series} />
        <StatBox label="Wanted Movies" value={data.wanted_movies} />
        <StatBox label="Providers" value={data.providers} />
      </StatRow>
      {data.version && <StatRow><StatBox label="Version" value={data.version} small truncate /></StatRow>}
      {data.history?.length > 0 && (
        <><div className="section-label">Recent</div><ItemList>{data.history.map((h, i) => <ItemRow key={i} name={h.title || h} />)}</ItemList></>
      )}
    </>
  );
}

function ProwlarrDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Indexers" value={data.indexers} />
        <StatBox label="Enabled" value={data.enabled} />
        <StatBox label="Failed" value={data.failed} />
      </StatRow>
      <StatRow>
        <StatBox label="Queries" value={fmt(data.queries_today)} small />
        <StatBox label="Grabs" value={data.grabs_today} small />
        <StatBox label="Avg Response" value={data.avg_response ? `${data.avg_response}ms` : '—'} small />
      </StatRow>
      {data.indexer_list?.length > 0 && (
        <><div className="section-label">Indexers</div><ItemList>{data.indexer_list.map((idx, i) => <ItemRow key={i} name={idx.name} dot={idx.enabled ? 'green' : 'red'} value={idx.avg_response ? `${idx.avg_response}ms` : '—'} />)}</ItemList></>
      )}
    </>
  );
}

function SabnzbdDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Queue" value={data.queue_count} />
        <StatBox label="Speed" value={data.speed || '—'} />
        <StatBox label="Disk Free" value={data.disk_free ? `${data.disk_free} GB` : '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Paused" value={data.paused_count} small muted />
        <StatBox label="Completed" value={data.completed_today} small />
      </StatRow>
      {data.queue?.length > 0 && (
        <><div className="section-label">Queue</div><ItemList>{data.queue.map((q, i) => <ItemRow key={i} name={q.name} value={`${q.sizeleft || '—'} left`} />)}</ItemList></>
      )}
    </>
  );
}

function QbittorrentDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Active" value={data.active} />
        <StatBox label="DL" value={data.dl_speed_fmt || '—'} />
        <StatBox label="UL" value={data.ul_speed_fmt || '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Seeding" value={data.seeding} small />
        <StatBox label="Paused" value={data.paused} small muted />
        <StatBox label="Total" value={data.total_size ? `${data.total_size} GB` : '—'} small />
      </StatRow>
      {data.torrents?.length > 0 && (
        <><div className="section-label">Active Torrents</div><ItemList>{data.torrents.map((t, i) => <ItemRow key={i} name={t.name} value={`${(t.progress * 100).toFixed(0)}%`} />)}</ItemList></>
      )}
    </>
  );
}

function MetubeDetail({ data }) {
  return (
    <StatRow>
      <StatBox label="Queue" value={data.queue_count} />
      <StatBox label="Completed" value={data.completed} />
      <StatBox label="Failed" value={data.failed} />
    </StatRow>
  );
}

function TautulliDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Streams" value={data.active_streams} />
        <StatBox label="Plays Today" value={data.plays_today} />
        <StatBox label="Users" value={data.users_today} />
      </StatRow>
      {data.streams?.length > 0 && (
        <>
          <div className="section-label">Now Streaming</div>
          {data.streams.map((s, i) => (
            <StreamRow key={i} title={`${s.user} · ${s.title}`}
              sub={[s.quality, s.transcode ? 'transcode' : 'direct'].filter(Boolean).join(' · ')} />
          ))}
        </>
      )}
      {(data.top_movie || data.top_show) && (
        <>
          <div className="section-label">Top This Month</div>
          <ItemList>
            {data.top_movie && <ItemRow name={data.top_movie} tag="Movie" />}
            {data.top_show && <ItemRow name={data.top_show} tag="Show" />}
            {data.top_user && <ItemRow name={data.top_user} tag="User" />}
          </ItemList>
        </>
      )}
      {data.recent_plays?.length > 0 && (
        <>
          <div className="section-label">Recently Played</div>
          <ItemList>
            {data.recent_plays.map((item, i) => (
              <ItemRow key={i} name={item.title} tag={item.user} value={item.date} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

function ImmichDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Photos" value={fmt(data.photos)} />
        <StatBox label="Videos" value={fmt(data.videos)} />
        <StatBox label="Storage" value={data.storage_used || '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Users" value={data.users} small />
        <StatBox label="Albums" value={data.albums} small />
        {data.version && <StatBox label="Version" value={data.version} small truncate />}
      </StatRow>
    </>
  );
}

function NextcloudDetail({ data }) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'system', label: 'System' },
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="Files" value={fmt(data.files)} />
            <StatBox label="Users" value={data.users_total || 0} />
            <StatBox label="Active 24h" value={data.active_users_24h || 0} />
            <StatBox label="Active 5m" value={data.active_users_5min || 0} />
          </StatRow>
          <StatRow>
            <StatBox label="Shares" value={data.shares || 0} small />
            {data.shares_fed_sent > 0 && <StatBox label="Fed Sent" value={data.shares_fed_sent} small />}
            {data.shares_fed_received > 0 && <StatBox label="Fed Recv" value={data.shares_fed_received} small />}
            <StatBox label="Apps" value={data.apps_installed || 0} small />
            {data.apps_updates > 0 && <StatBox label="Updates" value={data.apps_updates} valueColor="amber" small />}
          </StatRow>
          <StatRow>
            <StatBox label="Storage Free" value={data.storage_free || '—'} small />
            <StatBox label="DB Size" value={data.db_size || '—'} small />
            {data.storages > 0 && <StatBox label="Storages" value={`${data.storages_local || 0} local, ${data.storages_other || 0} ext`} small />}
          </StatRow>
          {data.version && (
            <StatRow>
              <StatBox label="Version" value={data.version} small />
              {data.response_time && <StatBox label="Response" value={`${data.response_time}ms`} small />}
            </StatRow>
          )}
        </>
      )}

      {tab === 'system' && (
        <>
          <StatRow>
            <StatBox label="CPU 1m" value={data.cpu_load != null ? `${data.cpu_load}%` : '—'} />
            {data.cpu_load_5 != null && <StatBox label="CPU 5m" value={`${data.cpu_load_5}%`} />}
            {data.cpu_load_15 != null && <StatBox label="CPU 15m" value={`${data.cpu_load_15}%`} />}
          </StatRow>
          {data.memory_pct != null && (
            <ProgressBar
              label={`Memory${data.memory_used && data.memory_total ? ` (${data.memory_used} / ${data.memory_total})` : ''}`}
              pct={data.memory_pct}
              value={`${data.memory_pct.toFixed(1)}%`}
              color={data.memory_pct > 90 ? 'red' : data.memory_pct > 80 ? 'amber' : undefined}
            />
          )}
          {data.swap_pct > 0 && (
            <ProgressBar
              label={`Swap${data.swap_used && data.swap_total ? ` (${data.swap_used} / ${data.swap_total})` : ''}`}
              pct={data.swap_pct}
              value={`${data.swap_pct.toFixed(1)}%`}
            />
          )}
          <div className="section-label mt-[12px]">Server</div>
          <StatRow>
            {data.webserver && <StatBox label="Web Server" value={data.webserver} small truncate />}
            {data.php_version && <StatBox label="PHP" value={data.php_version} small />}
          </StatRow>
          <StatRow>
            {data.db_type && <StatBox label="Database" value={`${data.db_type}${data.db_version ? ` ${data.db_version}` : ''}`} small truncate />}
            {data.php_memory_limit && <StatBox label="PHP Mem Limit" value={data.php_memory_limit} small />}
            {data.php_upload_max && <StatBox label="Upload Max" value={data.php_upload_max} small />}
          </StatRow>
        </>
      )}
    </>
  );
}

function OllamaDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Models" value={data.models_count} />
        <StatBox label="Running" value={data.running_count} />
        {data.version && <StatBox label="Version" value={data.version} small truncate />}
      </StatRow>
      {data.models?.length > 0 && (
        <><div className="section-label">Models</div><ItemList>{data.models.map((m, i) => <ItemRow key={i} name={m.name} tag={m.quantization} value={m.size} />)}</ItemList></>
      )}
    </>
  );
}

function LinkdingDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Bookmarks" value={data.bookmarks} />
        <StatBox label="Tags" value={data.tags} />
        <StatBox label="Unread" value={data.unread} />
      </StatRow>
      {data.recent?.length > 0 && (
        <><div className="section-label">Recent</div><ItemList>{data.recent.map((b, i) => <ItemRow key={i} name={b.title || b.url} value={b.date_added ? new Date(b.date_added).toLocaleDateString() : ''} />)}</ItemList></>
      )}
    </>
  );
}

function SpeedtestDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Download" value={data.download_mbps ? `${data.download_mbps} Mbps` : '—'} />
        <StatBox label="Upload" value={data.upload_mbps ? `${data.upload_mbps} Mbps` : '—'} />
        <StatBox label="Ping" value={data.ping_ms ? `${data.ping_ms} ms` : '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Avg DL" value={data.avg_download ? `${data.avg_download} Mbps` : '—'} small />
        <StatBox label="Avg UL" value={data.avg_upload ? `${data.avg_upload} Mbps` : '—'} small />
        <StatBox label="Last Test" value={data.last_test_ago || '—'} small />
      </StatRow>
      {(data.server || data.max_download) && (
        <StatRow>
          {data.server && <StatBox label="Server" value={data.server} small truncate />}
          {data.max_download && <StatBox label="Max DL" value={`${data.max_download} Mbps`} small />}
          {data.min_download && <StatBox label="Min DL" value={`${data.min_download} Mbps`} small />}
        </StatRow>
      )}
    </>
  );
}

function MariadbDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Connections" value={data.connections} />
        <StatBox label="Queries/s" value={data.queries_per_sec} />
        <StatBox label="Uptime" value={fmtUptime(data.uptime_seconds)} />
      </StatRow>
      <StatRow>
        <StatBox label="Tables" value={data.tables} small />
        <StatBox label="Databases" value={data.databases} small />
        {data.version && <StatBox label="Version" value={data.version} small truncate />}
      </StatRow>
    </>
  );
}

function RedisDetail({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Clients" value={data.connected_clients} />
        <StatBox label="Ops/sec" value={fmt(data.ops_per_sec)} />
        <StatBox label="Memory" value={data.memory_human || '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Keys" value={fmt(data.total_keys)} small />
        <StatBox label="Hit Rate" value={data.hit_rate != null ? `${data.hit_rate}%` : '—'} small />
        <StatBox label="Uptime" value={fmtUptime(data.uptime_seconds)} small />
      </StatRow>
      {data.version && <StatRow><StatBox label="Version" value={data.version} small truncate /><StatBox label="Mode" value={data.mode || 'standalone'} small /></StatRow>}
    </>
  );
}

/* ── Chart key labels + colours ── */
const chartKeyLabels = {
  cpu_usage: 'CPU %', ram_usage: 'RAM %', cpu_temp: 'CPU Temp',
  gpu_usage: 'GPU %', gpu_temp: 'GPU Temp',
  docker_running: 'Docker', total_used_tb: 'Storage Used',
  dns_queries: 'Queries', blocked_queries: 'Blocked', blocked_percentage: 'Block %',
  active_streams: 'Streams', cpu: 'CPU %',
  'ram.used': 'RAM Used',
  running_vms: 'Running VMs', running_lxcs: 'Running LXCs',
  up: 'Up', down: 'Down',
  total_monitors: 'Total Monitors',
  proxy_hosts: 'Proxy Hosts', ssl_hosts: 'SSL Hosts',
  dashboards: 'Dashboards', firing_alerts: 'Firing Alerts',
  queue_count: 'Queue', missing: 'Missing', plays_today: 'Plays',
  queries_today: 'Queries', grabs_today: 'Grabs',
  download_mbps: 'Download', upload_mbps: 'Upload', ping_ms: 'Ping',
  connections: 'Connections', queries_per_sec: 'Queries/s',
  connected_clients: 'Clients', ops_per_sec: 'Ops/sec', memory_used: 'Memory',
  photos: 'Photos', videos: 'Videos', bookmarks: 'Bookmarks',
  active: 'Active', dl_speed: 'DL Speed', speed_bytes: 'Speed',
  wanted_series: 'Wanted Series', wanted_movies: 'Wanted Movies',
  models_count: 'Models', running_count: 'Running',
  active_users_24h: 'Active Users', cpu_load: 'CPU Load',
  pending_count: 'Pending', total_requests: 'Total Requests',
};
const chartKeyColors = {
  cpu_usage: '#a78bfa', ram_usage: '#60a5fa', cpu_temp: '#f59e0b',
  gpu_usage: '#a78bfa', gpu_temp: '#f59e0b',
  docker_running: '#60a5fa', total_used_tb: '#34d399',
  dns_queries: '#60a5fa', blocked_queries: '#ef4444', blocked_percentage: '#ef4444',
  active_streams: '#22c55e', cpu: '#a78bfa',
  'ram.used': '#60a5fa',
  running_vms: '#22c55e', running_lxcs: '#60a5fa',
  up: '#22c55e', down: '#ef4444',
  queue_count: '#f59e0b', missing: '#ef4444', plays_today: '#a78bfa',
  queries_today: '#60a5fa', grabs_today: '#22c55e',
  download_mbps: '#22c55e', upload_mbps: '#60a5fa', ping_ms: '#f59e0b',
  connections: '#60a5fa', queries_per_sec: '#a78bfa',
  connected_clients: '#ef4444', ops_per_sec: '#60a5fa', memory_used: '#f59e0b',
  photos: '#a78bfa', videos: '#a78bfa', bookmarks: '#60a5fa',
  active: '#f59e0b', dl_speed: '#22c55e', speed_bytes: '#22c55e',
  pending_count: '#f59e0b', total_requests: '#a78bfa',
};
const speedKeys = new Set(['upload_mbps', 'download_mbps', 'dl_speed', 'speed_bytes']);

function chartLabel(key) {
  return chartKeyLabels[key] || key.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function chartColor(key, customSettings) {
  if (customSettings) return getGraphColor(key, customSettings);
  return chartKeyColors[key] || '#34d399';
}
function chartFmtValue(key, val) {
  if (speedKeys.has(key)) return fmtSpeed(val);
  return typeof val === 'number' ? fmt(val) : val;
}

function LinuxDetail({ data }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(data.containers?.length > 0 ? [{ key: 'containers', label: `Containers (${data.containers.length})` }] : []),
  ];

  return (
    <>
      <div className="flex gap-[4px] mb-[14px] border-b border-bd pb-[8px]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-[5px] px-[12px] rounded-[var(--radius-tag)] text-[12px] font-medium transition-colors
              ${tab === t.key ? 'bg-s2 text-t border border-bd2' : 'text-t3 border border-transparent hover:text-t2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <StatRow>
            <StatBox label="CPU" value={`${data.cpu_usage || 0}%`} />
            <StatBox label="RAM" value={`${data.ram_usage || 0}%`} />
            <StatBox label="Temp" value={`${data.cpu_temp || 0}°C`} />
          </StatRow>
          <StatRow>
            <StatBox label="Freq" value={`${data.cpu_freq_mhz || 0} MHz`} small />
            <StatBox label="Docker" value={`${data.docker_running || 0} / ${data.docker_total || 0}`} small />
            <StatBox label="Uptime" value={`${data.uptime_days || 0}d`} small />
          </StatRow>

          <div className="section-label">Hardware</div>
          <StatRow>
            {data.model && <StatBox label="Model" value={data.model} small truncate />}
            <StatBox label="OS" value={data.os || 'Linux'} small truncate />
          </StatRow>
          {data.cpu_model && (
            <StatRow>
              <StatBox label="CPU" value={data.cpu_model} small truncate />
              <StatBox label="Cores" value={data.cpu_cores || '?'} small />
            </StatRow>
          )}

          <div className="section-label">Memory</div>
          <StatRow>
            <StatBox label="Total" value={`${data.ram_total_gb || 0} GB`} small />
            <StatBox label="Used" value={`${data.ram_used_gb || 0} GB`} small />
            <StatBox label="Usage" value={`${data.ram_usage || 0}%`} small />
          </StatRow>

          <div className="section-label">Storage</div>
          <StatRow>
            <StatBox label="Total" value={`${data.disk_total_gb || 0} GB`} small />
            <StatBox label="Used" value={`${data.disk_used_gb || 0} GB`} small />
            <StatBox label="Usage" value={`${data.disk_usage || 0}%`} small />
          </StatRow>

          {data.gpu && (
            <>
              <div className="section-label">GPU</div>
              <StatRow>
                <StatBox label="Model" value={data.gpu.name} small truncate />
                {data.gpu.usage != null && <StatBox label="Usage" value={`${data.gpu.usage}%`} small />}
                {data.gpu.temp != null && <StatBox label="Temp" value={`${data.gpu.temp}°C`} small />}
              </StatRow>
              {(data.gpu.vram_total_mb || data.gpu.power_draw) && (
                <StatRow>
                  {data.gpu.vram_total_mb && <StatBox label="VRAM" value={`${data.gpu.vram_used_mb || 0} / ${data.gpu.vram_total_mb} MB`} small />}
                  {data.gpu.power_draw && <StatBox label="Power" value={`${data.gpu.power_draw}W`} small />}
                  {data.gpu.freq_mhz && <StatBox label="Freq" value={`${data.gpu.freq_mhz} MHz`} small />}
                </StatRow>
              )}
            </>
          )}

          <div className="section-label">Network</div>
          <StatRow>
            <StatBox label="Download" value={`${data.net_rx_mbps || 0} MB/s`} small />
            <StatBox label="Upload" value={`${data.net_tx_mbps || 0} MB/s`} small />
          </StatRow>
        </>
      )}

      {tab === 'containers' && (
        <>
          <div className="text-[11px] text-t3 uppercase tracking-[0.1em] font-semibold mb-[10px]">All Containers</div>
          <ItemList>
            {data.containers.map((c, i) => (
              <ItemRow key={i} name={c.name}
                dot={c.state === 'running' ? 'green' : 'red'}
                value={c.state === 'running' ? `${c.cpu}% · ${c.mem}` : 'stopped'}
                valueColor={c.state === 'running' ? undefined : 'red'} />
            ))}
          </ItemList>
        </>
      )}
    </>
  );
}

/* ── Type → renderer map ── */
const detailRenderers = {
  jellyfin: JellyfinDetail,
  plex: PlexDetail,
  proxmox: ProxmoxDetail,
  adguard: AdguardDetail,
  pihole: PiholeDetail,
  uptime_kuma: UptimeKumaDetail,
  portainer: PortainerDetail,
  nginx_proxy: NginxProxyDetail,
  grafana: GrafanaDetail,
  unraid: UnraidDetail,
  linux: LinuxDetail,
  vaultwarden: VaultwardenDetail,
  sonarr: SonarrDetail,
  radarr: RadarrDetail,
  bazarr: BazarrDetail,
  prowlarr: ProwlarrDetail,
  sabnzbd: SabnzbdDetail,
  qbittorrent: QbittorrentDetail,
  metube: MetubeDetail,
  tautulli: TautulliDetail,
  immich: ImmichDetail,
  nextcloud: NextcloudDetail,
  ollama: OllamaDetail,
  linkding: LinkdingDetail,
  speedtest_tracker: SpeedtestDetail,
  mariadb: MariadbDetail,
  redis_server: RedisDetail,
  searxng: GenericDetail,
  open_webui: GenericDetail,
  notifiarr: NotifiarrDetail,
  iperf3: Iperf3Detail,
  seerr: SeerrDetail,
  phpmyadmin: GenericDetail,
  generic: GenericDetail,
};

/* ── Slide-from-right Detail Panel ── */
export default function AppDetailModal({ app, onClose }) {
  const [activeKey, setActiveKey] = useState(null);
  const [closing, setClosing] = useState(false);
  const customSettings = useCustomise();

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  const { data: history, isLoading } = useQuery({
    queryKey: ['history', app.app_id],
    queryFn: () => getAppHistory(app.app_id),
    refetchInterval: 60000,
  });

  const chartKeys = [];
  if (history?.length > 0) {
    const keyCandidates = new Set();
    for (const h of history) {
      for (const key of Object.keys(h.data)) {
        if (typeof h.data[key] === 'number') keyCandidates.add(key);
      }
    }
    for (const key of keyCandidates) {
      const hasData = history.some(h => h.data[key] != null && h.data[key] !== 0);
      if (hasData) chartKeys.push(key);
    }
  }

  const currentKey = activeKey && chartKeys.includes(activeKey) ? activeKey : chartKeys[0];
  const chartData = currentKey ? (history?.map(h => ({
    time: new Date(h.recorded_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: h.data[currentKey] ?? 0,
  })) || []) : [];

  const status = app.data?.error ? 'offline' : (app.data?.status || 'unknown');
  const DetailRenderer = detailRenderers[app.type] || GenericDetail;
  const lastUpdated = app.updated_at
    ? new Date(app.updated_at * 1000).toLocaleString()
    : 'Never';

  return (
    <div
      className={`fixed inset-0 z-300 ${closing ? 'animate-fadeOut' : 'detail-overlay'}`}
      onClick={handleClose}
      data-category={app.category}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)] backdrop-blur-[6px]" />

      {/* Panel — slides from right */}
      <div
        className={`absolute top-0 right-0 h-full w-full min-w-[560px] max-w-[600px] bg-s1 border-l border-bd overflow-y-auto ${closing ? 'animate-slideOutRight' : 'detail-panel'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-[28px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-[20px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="w-[40px] h-[40px] rounded-[10px] border border-bd bg-s2 flex items-center justify-center text-[20px] shrink-0">
                {app.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-semibold tracking-[-0.3px]">{app.name}</div>
                <div className="flex items-center gap-[6px] mt-[2px]">
                  <StatusPill status={status} />
                  <span className="text-[10px] text-t3 uppercase tracking-[0.1em]">{app.category}</span>
                </div>
              </div>
            </div>
            <button onClick={handleClose}
              className="w-[30px] h-[30px] bg-s2 border border-bd rounded-[var(--radius-inner)] flex items-center justify-center text-t3 hover:text-t hover:bg-s3 transition-colors text-[14px] shrink-0">
              &#x2715;
            </button>
          </div>

          {/* URL */}
          {(app.open_url || app.url) && (
            <a href={app.open_url || app.url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-t3 font-mono hover:text-t2 transition-colors truncate block mb-[16px]">
              {app.open_url || app.url} &#x2197;
            </a>
          )}

          {/* Error */}
          {app.data?.error && (
            <div className="bg-rd text-red rounded-[var(--radius-inner)] px-[12px] py-[10px] text-[13px] mb-[16px]">
              {app.data.error}
            </div>
          )}

          {/* Stats detail */}
          {app.data && !app.data.error && <DetailRenderer data={app.data} appId={app.app_id} />}

          {/* Last updated */}
          <div className="text-[11px] text-t3 text-right mt-[12px] mb-[4px]">
            Last updated: {lastUpdated}
          </div>

          {/* Chart */}
          {isLoading && (
            <div className="flex justify-center py-[24px]">
              <div className="w-[16px] h-[16px] border-2 border-t3 border-t-t rounded-full animate-spin" />
            </div>
          )}
          {chartKeys.length > 0 && (
            <div className="mt-[16px]">
              <div className="section-label">24h History</div>
              <div className="flex gap-[5px] mb-[10px] flex-wrap">
                {chartKeys.map(k => (
                  <button key={k}
                    onClick={() => setActiveKey(k)}
                    className={`py-[4px] px-[10px] rounded-[var(--radius-tag)] text-[11px] font-medium border transition-colors
                      ${k === currentKey ? 'bg-s2 border-bd2 text-t' : 'bg-transparent border-bd text-t3 hover:text-t2'}`}>
                    {chartLabel(k)}
                  </button>
                ))}
              </div>
              <div className="bg-s2 rounded-[var(--radius-inner)] p-[12px]">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`chartGrad-${currentKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor(currentKey, customSettings)} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={chartColor(currentKey, customSettings)} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#3f3f46' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#3f3f46' }} axisLine={false} tickLine={false} width={52} domain={[0, 'auto']} tickFormatter={(v) => chartFmtValue(currentKey, v)} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f0f11', border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 8, fontSize: 12, color: '#f4f4f5', padding: '8px 12px',
                      }}
                      labelStyle={{ color: '#71717a', fontSize: 11 }}
                      formatter={(val) => [chartFmtValue(currentKey, val), chartLabel(currentKey)]}
                    />
                    <Area type="monotone" dataKey="value" stroke={chartColor(currentKey, customSettings)} strokeWidth={2}
                      fill={`url(#chartGrad-${currentKey})`} dot={false} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {!isLoading && chartKeys.length === 0 && (
            <div className="text-[12px] text-t3 text-center py-[16px] mt-[12px]">
              No history data yet — check back in a few minutes.
            </div>
          )}

          {/* Launch link */}
          {(app.open_url || app.url) && (
            <a href={app.open_url || app.url} target="_blank" rel="noopener noreferrer"
              className="block mt-[16px] text-center py-[10px] bg-s2 border border-bd rounded-[var(--radius-inner)] text-[13px] font-medium text-t3 hover:bg-s3 hover:text-t2 transition-colors">
              Open {app.name} &#x2197;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
