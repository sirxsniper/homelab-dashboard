import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function SabnzbdCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Queue" value={<AnimatedNumber value={data.queue_count || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Speed" value={data.speed || '—'} />
        <StatBox label="DISK" value={data.disk_free || '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="DL'ING" value={fmt(data.downloading)} small />
        <StatBox label="Paused" value={fmt(data.paused_count)} small muted />
        <StatBox label="DONE" value={fmt(data.completed_today)} small />
      </StatRow>

      {data.queue?.length > 0 && (
        <>
          <div className="section-label">Queue</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.queue.slice(0, 4).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between mb-[4px]">
                  <span className="text-[12px] text-t truncate">{item.name || item.title}</span>
                  <span className="text-[10px] text-t3 font-mono shrink-0 ml-2">{item.size_remaining || item.sizeleft}</span>
                </div>
                <ProgressBar label="" pct={item.progress || 0} value={`${(item.progress || 0).toFixed(1)}%`} />
              </div>
            ))}
          </div>
        </>
      )}

      {data.history?.length > 0 && (
        <>
          <div className="section-label">Recent</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.history.slice(0, 3).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-t truncate">{item.name}</span>
                  <span className="text-[10px] text-t3 font-mono shrink-0 ml-2">{item.size}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
