import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function QbittorrentCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Active" value={<AnimatedNumber value={data.active || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="DOWN" value={<span className="text-green-400">{data.dl_speed_fmt || '0 B/s'}</span>} />
        <StatBox label="UP" value={<span className="text-blue-400">{data.ul_speed_fmt || '0 B/s'}</span>} />
      </StatRow>

      <StatRow>
        <StatBox label="Seeding" value={fmt(data.seeding)} small />
        <StatBox label="Paused" value={fmt(data.paused)} small muted />
        <StatBox label="SIZE" value={data.total_size || '—'} small />
      </StatRow>

      {data.torrents?.length > 0 && (
        <>
          <div className="section-label">Active</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.torrents.slice(0, 4).map((t, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between mb-[4px]">
                  <span className="text-[12px] text-t truncate">{t.name}</span>
                  <div className="flex items-center gap-[6px] shrink-0 ml-2">
                    {t.dlspeed > 0 && <span className="text-[10px] text-t3 font-mono">{(t.dlspeed / 1024 / 1024).toFixed(1)} MB/s</span>}
                  </div>
                </div>
                <ProgressBar label="" pct={t.progress || 0} value={`${(t.progress || 0).toFixed(1)}%`} />
              </div>
            ))}
          </div>
        </>
      )}

      {!data.torrents?.length && data.completed_list?.length > 0 && (
        <>
          <div className="section-label">Completed</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.completed_list.slice(0, 3).map((t, i) => (
              <div key={i} className="ir py-[5px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-t truncate">{t.name}</span>
                  <span className="text-[10px] text-t3 font-mono shrink-0 ml-2">{t.size}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!data.torrents?.length && !data.completed_list?.length && (data.dl_today || data.ul_today) && (
        <div className="text-[11px] text-t3 font-mono text-center py-[4px]">
          Today: {data.dl_today || '0 B'} down · {data.ul_today || '0 B'} up
        </div>
      )}
    </div>
  );
}
