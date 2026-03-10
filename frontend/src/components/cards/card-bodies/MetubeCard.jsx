import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import { fmt } from '../../../utils/fmt';

export default function MetubeCard({ data }) {
  const hasQueue = data.queue?.length > 0;
  const showEmpty = !hasQueue && !data.completed;

  return (
    <div>
      <StatRow>
        <StatBox label="In Queue" value={<span className={data.in_queue > 0 ? 'text-amber' : ''}>{fmt(data.in_queue || 0)}</span>} accent />
        <StatBox label="Completed" value={<span className="text-green-400">{fmt(data.completed || 0)}</span>} />
        <StatBox label="Failed" value={<span className={data.failed > 0 ? 'text-red' : ''}>{fmt(data.failed || 0)}</span>} />
      </StatRow>

      {hasQueue && (
        <>
          <div className="section-label">Queue</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.queue.slice(0, 4).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="text-[12px] text-t truncate mb-[4px]">{item.title || item.name}</div>
                <ProgressBar label="" pct={item.progress || 0} value={`${(item.progress || 0).toFixed(1)}%`} />
              </div>
            ))}
          </div>
        </>
      )}

      {showEmpty && (
        <div className="text-center py-[12px] text-t3 text-[13px]">No active downloads</div>
      )}
    </div>
  );
}
