import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

const fmtUptime = (s) => { if (!s) return '—'; const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };

export default function MariadbCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Connections" value={<AnimatedNumber value={data.connections || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Queries/s" value={data.queries_per_sec != null ? fmt(data.queries_per_sec) : '—'} />
        <StatBox label="Uptime" value={fmtUptime(data.uptime)} />
      </StatRow>

      <StatRow>
        <StatBox label="Tables" value={fmt(data.tables)} small />
        <StatBox label="Databases" value={fmt(data.databases)} small />
        <StatBox label="Version" value={data.version || '—'} small muted />
      </StatRow>
    </div>
  );
}
