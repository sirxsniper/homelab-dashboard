import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function LinkdingCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Bookmarks" value={<AnimatedNumber value={data.bookmarks || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Tags" value={fmt(data.tags)} />
        <StatBox label="Unread" value={<span className={data.unread > 0 ? 'text-amber' : ''}>{fmt(data.unread || 0)}</span>} />
      </StatRow>

      {data.recent?.length > 0 && (
        <>
          <div className="section-label">Recent</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.recent.slice(0, 3).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-t truncate">{item.title || item.url}</span>
                  <span className="text-[10px] text-t3 font-mono shrink-0 ml-2">{item.domain}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
