import { useRef, useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';
import AnimatedNumber from '../../ui/AnimatedNumber';

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function fmtMbps(v) {
  if (!v) return '0';
  return v >= 1000 ? `${(v / 1000).toFixed(1)}` : v.toFixed(1);
}

function fmtMbpsUnit(v) {
  if (!v) return 'Mbps';
  return v >= 1000 ? 'Gbps' : 'Mbps';
}

function fmtBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function ClientPill({ client, detail }) {
  return (
    <div className="flex items-center gap-[6px] bg-s2 rounded-[var(--radius-inner)] px-[8px] py-[5px] text-[11px] transition-colors min-w-0 border border-bd/50">
      <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${client.is_wired ? 'bg-blue' : 'bg-green'}`} />
      <span className="text-t2 truncate font-medium">{client.name}</span>
      {detail && (
        <>
          <span className="text-t3 shrink-0 opacity-60 text-[10px]">{client.is_wired ? 'LAN' : client.essid || 'WiFi'}</span>
          <span className="text-t3 shrink-0 ml-auto font-mono text-[10px]">{fmtBytes(client.tx_bytes + client.rx_bytes)}</span>
        </>
      )}
      {!detail && (
        <span className="text-t3 shrink-0 opacity-60 text-[10px]">{client.is_wired ? 'LAN' : 'WiFi'}</span>
      )}
    </div>
  );
}

function LiveGraph({ label, rawData, color, unit, height, currentValue }) {
  const chartData = useMemo(() => {
    if (rawData && rawData.length >= 2) {
      return rawData.map((v, i) => ({ i, value: v }));
    }
    const val = rawData?.[0] ?? currentValue ?? 0;
    return Array.from({ length: 10 }, (_, i) => ({ i, value: i === 9 ? val : 0 }));
  }, [rawData, currentValue]);

  const gradId = `unifi-grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="bg-s2 rounded-[var(--radius-inner)] p-[10px] border border-bd/30">
      <div className="flex items-center justify-between mb-[4px] px-[2px]">
        <span className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em]">{label}</span>
        <span className="font-mono text-[11px] text-t2">
          {typeof chartData[chartData.length - 1]?.value === 'number'
            ? chartData[chartData.length - 1].value.toFixed(1)
            : chartData[chartData.length - 1]?.value}{unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height || 100}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fontSize: 9, fill: '#3f3f46' }} axisLine={false} tickLine={false} width={36} domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{
              background: '#0f0f11', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8, fontSize: 11, color: '#f4f4f5', padding: '6px 10px',
            }}
            labelStyle={{ display: 'none' }}
            formatter={(val) => [`${typeof val === 'number' ? val.toFixed(2) : val}${unit}`, label]}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
            fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function UnifiCard({ data, sparkline }) {
  const ref = useRef(null);
  const w = useWidth(ref);

  const isCompact = w > 0 && w < 370;
  const isNormal = w >= 370 && w < 500;
  const isWide = w >= 500 && w < 750;
  const isExtra = w >= 750 && w < 1200;
  const isFull = w >= 1200;

  const clientsH = sparkline?.total_clients || [];
  const cpuH = sparkline?.gw_cpu || [];
  const memH = sparkline?.gw_mem || [];
  const rxH = sparkline?.wan_rx || [];
  const txH = sparkline?.wan_tx || [];

  const cpuPct = data.gw_cpu || 0;
  const memPct = data.gw_mem || 0;
  const topClients = data.top_clients || [];

  return (
    <div ref={ref}>
      {isCompact && (
        <>
          <StatRow>
            <StatBox label="Clients" value={<AnimatedNumber value={data.total_clients || 0} />} accent />
            <StatBox label="Devices" value={<AnimatedNumber value={data.total_devices || 0} />} />
          </StatRow>
          <LiveGraph label="Clients" rawData={clientsH} currentValue={data.total_clients || 0} color="#60a5fa" unit="" height={50} />
          <CardFooter
            left={data.isp !== '—' ? data.isp : data.gw_name}
            right={`↓${fmtMbps(data.wan_rx)} ↑${fmtMbps(data.wan_tx)}`}
          />
        </>
      )}

      {isNormal && (
        <>
          <StatRow>
            <StatBox label="Clients" value={<AnimatedNumber value={data.total_clients || 0} />} accent />
            <StatBox label="WiFi" value={<AnimatedNumber value={data.wireless_clients || 0} />} />
            <StatBox label="Wired" value={<AnimatedNumber value={data.wired_clients || 0} />} />
          </StatRow>
          <StatRow>
            <StatBox label="↓ Download" value={`${(data.wan_down || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="↑ Upload" value={`${(data.wan_up || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="Ping" value={`${data.wan_ping || data.wan_latency || 0} ms`} small muted />
          </StatRow>
          <div className="grid grid-cols-2 gap-[6px]">
            <LiveGraph label="Clients" rawData={clientsH} currentValue={data.total_clients || 0} color="#60a5fa" unit="" height={65} />
            <LiveGraph label="GW CPU" rawData={cpuH} currentValue={cpuPct} color="#a78bfa" unit="%" height={65} />
          </div>
          <CardFooter
            left={data.isp !== '—' ? data.isp : data.gw_name}
            right={data.wan_ip !== '—' ? data.wan_ip : undefined}
          />
        </>
      )}

      {isWide && (
        <>
          <StatRow>
            <StatBox label="Clients" value={<AnimatedNumber value={data.total_clients || 0} />} accent />
            <StatBox label="WiFi" value={<AnimatedNumber value={data.wireless_clients || 0} />} />
            <StatBox label="Wired" value={<AnimatedNumber value={data.wired_clients || 0} />} />
            <StatBox label="Devices" value={<AnimatedNumber value={data.total_devices || 0} />} />
          </StatRow>
          <StatRow>
            <StatBox label="↓ Download" value={`${(data.wan_down || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="↑ Upload" value={`${(data.wan_up || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="Ping" value={`${data.wan_ping || 0} ms`} small />
            <StatBox label="GW CPU" value={<><AnimatedNumber value={cpuPct} />{cpuPct ? '%' : ''}</>} />
          </StatRow>

          <div className="grid grid-cols-3 gap-[6px] mt-[8px]">
            <LiveGraph label="Clients" rawData={clientsH} currentValue={data.total_clients || 0} color="#60a5fa" unit="" height={70} />
            <LiveGraph label="GW CPU" rawData={cpuH} currentValue={cpuPct} color="#a78bfa" unit="%" height={70} />
            <LiveGraph label="WAN ↓" rawData={rxH} currentValue={data.wan_rx || 0} color="#4ade80" unit=" Mbps" height={70} />
          </div>

          {topClients.length > 0 && (
            <div className="flex flex-wrap gap-[4px] mt-[6px] mb-[6px] max-h-[54px] overflow-y-auto">
              {topClients.slice(0, 8).map(c => <ClientPill key={c.mac} client={c} />)}
            </div>
          )}

          <CardFooter
            left={[data.isp !== '—' && data.isp, data.gw_uptime_fmt && `Up ${data.gw_uptime_fmt}`].filter(Boolean).join(' · ')}
            right={data.wan_ip !== '—' ? data.wan_ip : undefined}
          />
        </>
      )}

      {isExtra && (
        <>
          <StatRow>
            <StatBox label="Clients" value={<AnimatedNumber value={data.total_clients || 0} />} accent />
            <StatBox label="WiFi" value={<AnimatedNumber value={data.wireless_clients || 0} />} />
            <StatBox label="Wired" value={<AnimatedNumber value={data.wired_clients || 0} />} />
            <StatBox label="Guest" value={<AnimatedNumber value={data.guest_clients || 0} />} muted />
            <StatBox label="Devices" value={<AnimatedNumber value={data.total_devices || 0} />} />
            <StatBox label="APs" value={<AnimatedNumber value={data.aps || 0} />} />
          </StatRow>
          <StatRow>
            <StatBox label="↓ Download" value={`${(data.wan_down || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="↑ Upload" value={`${(data.wan_up || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="Ping" value={`${data.wan_ping || 0} ms`} small />
            <StatBox label="Latency" value={`${data.wan_latency || 0} ms`} small muted />
            <StatBox label="GW CPU" value={<><AnimatedNumber value={cpuPct} />%</>} />
            <StatBox label="GW Mem" value={<><AnimatedNumber value={memPct} />%</>} muted />
          </StatRow>

          <div className="grid grid-cols-4 gap-[6px] mt-[6px]">
            <LiveGraph label="Clients" rawData={clientsH} currentValue={data.total_clients || 0} color="#60a5fa" unit="" height={70} />
            <LiveGraph label="GW CPU" rawData={cpuH} currentValue={cpuPct} color="#a78bfa" unit="%" height={70} />
            <LiveGraph label="WAN ↓" rawData={rxH} currentValue={data.wan_rx || 0} color="#4ade80" unit=" Mbps" height={70} />
            <LiveGraph label="WAN ↑" rawData={txH} currentValue={data.wan_tx || 0} color="#38bdf8" unit=" Mbps" height={70} />
          </div>

          {topClients.length > 0 && (
            <div className="mt-[6px]">
              <div className="flex flex-wrap gap-[4px] max-h-[58px] overflow-y-auto">
                {topClients.slice(0, 15).map(c => <ClientPill key={c.mac} client={c} detail />)}
              </div>
            </div>
          )}

          <CardFooter
            left={[data.isp !== '—' && data.isp, data.gw_name !== '—' && data.gw_name, data.gw_uptime_fmt && `Up ${data.gw_uptime_fmt}`].filter(Boolean).join(' · ')}
            right={data.wan_ip !== '—' ? data.wan_ip : undefined}
          />
        </>
      )}

      {isFull && (
        <>
          <StatRow>
            <StatBox label="Total Clients" value={<AnimatedNumber value={data.total_clients || 0} />} accent />
            <StatBox label="WiFi" value={<AnimatedNumber value={data.wireless_clients || 0} />} />
            <StatBox label="Wired" value={<AnimatedNumber value={data.wired_clients || 0} />} />
            <StatBox label="Guest" value={<AnimatedNumber value={data.guest_clients || 0} />} muted />
            <StatBox label="Devices" value={<AnimatedNumber value={data.total_devices || 0} />} />
            <StatBox label="APs" value={<AnimatedNumber value={data.aps || 0} />} />
          </StatRow>
          <StatRow>
            <StatBox label="↓ Speedtest DL" value={`${(data.wan_down || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="↑ Speedtest UL" value={`${(data.wan_up || 0).toFixed(0)} Mbps`} truncate />
            <StatBox label="Ping" value={`${data.wan_ping || 0} ms`} small />
            <StatBox label="Latency" value={`${data.wan_latency || 0} ms`} small muted />
            <StatBox label="GW CPU" value={<><AnimatedNumber value={cpuPct} />%</>} />
            <StatBox label="GW Mem" value={<><AnimatedNumber value={memPct} />%</>} muted />
          </StatRow>

          <div className="grid grid-cols-5 gap-[6px] mt-[8px]">
            <LiveGraph label="Clients" rawData={clientsH} currentValue={data.total_clients || 0} color="#60a5fa" unit="" height={70} />
            <LiveGraph label="GW CPU" rawData={cpuH} currentValue={cpuPct} color="#a78bfa" unit="%" height={70} />
            <LiveGraph label="GW Memory" rawData={memH} currentValue={memPct} color="#f472b6" unit="%" height={70} />
            <LiveGraph label="WAN ↓" rawData={rxH} currentValue={data.wan_rx || 0} color="#4ade80" unit=" Mbps" height={70} />
            <LiveGraph label="WAN ↑" rawData={txH} currentValue={data.wan_tx || 0} color="#38bdf8" unit=" Mbps" height={70} />
          </div>

          {topClients.length > 0 && (
            <div className="mt-[8px]">
              <div className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em] mb-[4px] pl-[2px]">Top Clients</div>
              <div className="flex flex-wrap gap-[4px] max-h-[72px] overflow-y-auto">
                {topClients.slice(0, 30).map(c => <ClientPill key={c.mac} client={c} detail />)}
              </div>
            </div>
          )}

          <CardFooter
            left={[data.isp !== '—' && data.isp, data.gw_name !== '—' && data.gw_name, data.gw_version !== '—' && `v${data.gw_version}`, data.gw_uptime_fmt && `Up ${data.gw_uptime_fmt}`].filter(Boolean).join(' · ')}
            right={[data.wan_ip !== '—' && data.wan_ip, data.wan_availability != null && `${data.wan_availability.toFixed(1)}% avail`].filter(Boolean).join(' · ')}
          />
        </>
      )}
    </div>
  );
}
