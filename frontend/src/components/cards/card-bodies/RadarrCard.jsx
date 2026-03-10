import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function RadarrCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Movies" value={<AnimatedNumber value={data.movies || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Missing" value={<span className={data.missing > 0 ? 'text-red' : ''}>{fmt(data.missing || 0)}</span>} />
        <StatBox label="Queue" value={<span className={data.queue_count > 0 ? 'text-amber' : ''}>{fmt(data.queue_count || 0)}</span>} />
      </StatRow>

      <StatRow>
        <StatBox label="Monitored" value={fmt(data.monitored)} small />
        <StatBox label="UNMON" value={fmt(data.unmonitored)} small muted />
        <StatBox label="Disk" value={data.disk_free != null ? `${Math.round(data.disk_free)} GB` : '—'} small />
      </StatRow>

      {data.upcoming?.length > 0 && (
        <>
          <div className="section-label">Upcoming</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.upcoming.slice(0, 3).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-t truncate">{item.title}</span>
                  <div className="flex items-center gap-[4px] shrink-0 ml-2">
                    {item.releaseType && <span className="text-[9px] text-t3 bg-s3 px-[5px] py-[1px] rounded-[3px] font-mono uppercase">{item.releaseType}</span>}
                    <span className="text-[10px] text-t3 font-mono">{item.releaseDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.queue_count > 0 && data.queue?.length > 0 && (
        <>
          <div className="section-label">Downloading</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.queue.slice(0, 3).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="text-[12px] text-t truncate mb-[4px]">{item.title || item.name}</div>
                <ProgressBar label="" pct={item.progress || 0} value={`${(item.progress || 0).toFixed(1)}%`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
