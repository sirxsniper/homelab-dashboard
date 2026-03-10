import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt, fmtPct } from '../../../utils/fmt';

const fmtUptime = (s) => { if (!s) return '—'; const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };

export default function RedisCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Clients" value={<AnimatedNumber value={data.clients || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Ops/sec" value={fmt(data.ops_per_sec)} />
        <StatBox label="Memory" value={data.memory || '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="Keys" value={fmt(data.keys)} small />
        <StatBox label="Hit Rate" value={fmtPct(data.hit_rate)} small />
        <StatBox label="Uptime" value={fmtUptime(data.uptime)} small />
      </StatRow>
    </div>
  );
}
