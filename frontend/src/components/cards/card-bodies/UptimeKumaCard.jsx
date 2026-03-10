import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';
import { fmtMs } from '../../../utils/fmt';

export default function UptimeKumaCard({ data }) {
  const monitors = data.monitors || [];
  const avgLatency = monitors.length > 0
    ? monitors.reduce((sum, m) => sum + (m.latency || 0), 0) / monitors.length
    : 0;

  return (
    <div>
      <StatRow>
        <StatBox label="Up" value={<span className="text-green-400">{data.up || 0}</span>} />
        <StatBox label="Down" value={<span className={data.down > 0 ? 'text-red' : ''}>{data.down || 0}</span>} />
        <StatBox label="Latency" value={fmtMs(avgLatency)} />
      </StatRow>

      {/* Mini status strip — one dot per monitor */}
      {monitors.length > 0 && (
        <div className="flex flex-wrap gap-[4px] mt-[10px] mb-[8px] px-[2px]" title={`${monitors.length} monitors`}>
          {monitors.map((m, i) => (
            <span
              key={i}
              className="w-[8px] h-[8px] rounded-full shrink-0 cursor-default"
              style={{ background: m.status === 'up' ? '#22c55e' : m.status === 'down' ? '#f87171' : '#f59e0b' }}
              title={`${m.name}: ${m.status === 'up' ? `${m.latency || 0}ms` : 'DOWN'}`}
            />
          ))}
        </div>
      )}

      <CardFooter
        left={data.down > 0 ? `${data.down} service${data.down !== 1 ? 's' : ''} down` : 'All systems operational'}
        right={data.last_check || undefined}
      />
    </div>
  );
}
