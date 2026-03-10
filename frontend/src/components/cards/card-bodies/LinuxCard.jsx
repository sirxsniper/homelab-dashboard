import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import Sparkline from '../../ui/Sparkline';
import CardFooter from '../../ui/CardFooter';
import AnimatedNumber from '../../ui/AnimatedNumber';

export default function LinuxCard({ data, sparkline }) {
  if (!data.cpu_usage && data.response_time != null) {
    return (
      <StatRow>
        <StatBox label="Status" value={data.status || 'unknown'} />
        <StatBox label="Response" value={`${data.response_time}ms`} small />
      </StatRow>
    );
  }

  const cpuHistory = sparkline?.cpu || [];
  const ramHistory = sparkline?.ram || [];

  return (
    <div>
      <StatRow>
        <StatBox label="CPU" value={<><AnimatedNumber value={data.cpu_usage || 0} />%</>} accent />
        <StatBox label="RAM" value={<><AnimatedNumber value={data.ram_usage || 0} />%</>} />
        <StatBox label="Temp" value={data.cpu_temp ? `${data.cpu_temp}°C` : 'N/A'} small />
        {data.docker_total > 0
          ? <StatBox label="Docker" value={`${data.docker_running || 0}/${data.docker_total}`} small />
          : <StatBox label="Cores" value={data.cpu_cores || '?'} small />
        }
      </StatRow>

      {/* Live sparklines */}
      <div className="mt-[10px] flex flex-col gap-[4px]">
        <div className="flex items-center gap-[10px] bg-s2 rounded-[var(--radius-inner)] px-[12px] py-[8px]">
          <span className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em] min-w-[28px]">CPU</span>
          <div className="flex-1 h-[36px]">
            <Sparkline data={cpuHistory} color="var(--spark-cpu, #60a5fa)" height={36} />
          </div>
          <span className="font-mono text-[11px] text-t2 min-w-[42px] text-right">{(data.cpu_usage || 0).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-[10px] bg-s2 rounded-[var(--radius-inner)] px-[12px] py-[8px]">
          <span className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em] min-w-[28px]">RAM</span>
          <div className="flex-1 h-[36px]">
            <Sparkline data={ramHistory} color="var(--spark-ram, #a78bfa)" height={36} />
          </div>
          <span className="font-mono text-[11px] text-t2 min-w-[42px] text-right">{(data.ram_usage || 0).toFixed(1)}%</span>
        </div>
      </div>

      <ProgressBar
        label={`Storage ${data.disk_used_gb || 0} / ${data.disk_total_gb || 0} GB`}
        pct={data.disk_usage || 0}
        color={data.disk_usage > 90 ? 'red' : data.disk_usage > 80 ? 'amber' : undefined}
      />

      <CardFooter
        left={[
          data.gpu?.name && `GPU ${data.gpu.temp ? data.gpu.temp + '°C' : data.gpu.name}`,
          data.cpu_freq_mhz > 0 && `${data.cpu_freq_mhz}MHz`,
          data.uptime_days > 0 && `${data.uptime_days}d up`,
        ].filter(Boolean).join(' · ')}
        right={data.net_rx_mbps != null ? `↓${data.net_rx_mbps} ↑${data.net_tx_mbps} MB/s` : undefined}
      />
    </div>
  );
}
