import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import Sparkline from '../../ui/Sparkline';
import CardFooter from '../../ui/CardFooter';
import AnimatedNumber from '../../ui/AnimatedNumber';

export default function UnraidCard({ data, sparkline }) {
  if (!data.docker_total && data.response_time != null) {
    return (
      <StatRow>
        <StatBox label="Status" value={data.status || 'unknown'} />
        <StatBox label="Response" value={`${data.response_time}ms`} small />
      </StatRow>
    );
  }

  const storagePct = data.total_usable_tb > 0
    ? (data.total_used_tb / data.total_usable_tb) * 100
    : 0;

  const cpuHistory = sparkline?.cpu || [];
  const ramHistory = sparkline?.ram || [];

  return (
    <div>
      <StatRow>
        <StatBox label="CPU" value={<><AnimatedNumber value={data.cpu_usage || 0} />%</>} accent />
        <StatBox label="RAM" value={<><AnimatedNumber value={data.ram_usage || 0} />%</>} />
        <StatBox label="Array" value={data.array_state || 'N/A'} small />
        <StatBox label="Docker" value={`${data.docker_running || 0}/${data.docker_total || 0}`} small />
      </StatRow>

      {/* Live sparklines — separate rows, distinct colors */}
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
        label={`Storage ${data.total_used_tb || 0} / ${data.total_usable_tb || 0} TB`}
        pct={storagePct}
        color={storagePct > 90 ? 'red' : storagePct > 80 ? 'amber' : undefined}
      />

      <CardFooter
        left={[data.cpu_temp != null && `${data.cpu_temp}°C`, data.cpu_power != null && `${data.cpu_power}W`, data.uptime_days > 0 && `${data.uptime_days}d up`].filter(Boolean).join(' · ')}
        right={data.drive_temps?.length > 0 ? `${data.drive_temps.length} drives` : undefined}
      />
    </div>
  );
}
