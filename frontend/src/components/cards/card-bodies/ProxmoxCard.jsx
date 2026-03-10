import StatBox, { StatRow } from '../../ui/StatBox';
import Sparkline from '../../ui/Sparkline';
import CardFooter from '../../ui/CardFooter';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmtGb } from '../../../utils/fmt';

export default function ProxmoxCard({ data, sparkline }) {
  const running = (data.running_vms || 0) + (data.running_lxcs || 0);
  const total = (data.total_vms || 0) + (data.total_lxcs || 0);
  const stopped = total - running;

  const cpuHistory = sparkline?.cpu || [];
  const ramHistory = sparkline?.ram || [];

  // Filter out dummy/integrated GPUs
  const realGpus = (data.gpus || []).filter(g => g.power_draw > 0 || g.freq_mhz > 0);

  return (
    <div>
      <StatRow>
        <StatBox label="Running" value={<AnimatedNumber value={running} />} accent />
        <StatBox label="CPU" value={<><AnimatedNumber value={data.cpu || 0} />%</>} />
        <StatBox label="RAM" value={fmtGb(data.ram?.used)} sub={`of ${fmtGb(data.ram?.total)}`} />
        <StatBox label="Stopped" value={stopped} small muted />
      </StatRow>

      {/* Live sparklines — separate rows, distinct colors */}
      <div className="mt-[10px] flex flex-col gap-[4px]">
        <div className="flex items-center gap-[10px] bg-s2 rounded-[var(--radius-inner)] px-[12px] py-[8px]">
          <span className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em] min-w-[28px]">CPU</span>
          <div className="flex-1 h-[36px]">
            <Sparkline data={cpuHistory} color="var(--spark-cpu, #60a5fa)" height={36} />
          </div>
          <span className="font-mono text-[11px] text-t2 min-w-[42px] text-right">{(data.cpu || 0).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-[10px] bg-s2 rounded-[var(--radius-inner)] px-[12px] py-[8px]">
          <span className="text-[10px] font-semibold text-t3 uppercase tracking-[0.08em] min-w-[28px]">RAM</span>
          <div className="flex-1 h-[36px]">
            <Sparkline data={ramHistory} color="var(--spark-ram, #a78bfa)" height={36} />
          </div>
          <span className="font-mono text-[11px] text-t2 min-w-[42px] text-right">{data.ram?.total ? ((data.ram.used / data.ram.total) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      <CardFooter
        left={realGpus.length > 0 ? `GPU ${realGpus[0].name.split(' ').pop()} · ${realGpus[0].temp}°C · ${realGpus[0].power_draw}W` : `v${data.version || '?'}`}
        right={data.zfs_health ? `ZFS ${data.zfs_health}` : undefined}
      />
    </div>
  );
}
