import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

function relDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[2], parts[1] - 1, parts[0]);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function TautulliCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="PLAYS" value={<AnimatedNumber value={data.plays_today || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Streams" value={fmt(data.streams_count || data.active_streams)} />
        <StatBox label="USERS" value={fmt(data.users_today)} />
      </StatRow>

      {data.streams?.length > 0 && (
        <>
          <div className="section-label">Plex Streams</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.streams.map((s, i) => (
              <div key={i} className="ir py-[7px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[7px] min-w-0 flex-1">
                    <span className="w-[5px] h-[5px] rounded-full bg-green-400 animate-greenPulse shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12px] text-t font-semibold truncate">{s.user}</div>
                      <div className="text-[11px] text-t2 truncate">{s.title}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-[8px]">
                    <div className="flex items-center gap-[4px] justify-end">
                      {s.quality && <span className="text-[9px] text-t3 bg-s3 px-[5px] py-[1px] rounded-[3px] font-mono uppercase">{s.quality}</span>}
                      {s.transcode && <span className="text-[9px] text-amber font-mono uppercase bg-amber/10 px-[5px] py-[1px] rounded-[3px]">transcode</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No streams fallback */}
      {!data.streams?.length && (
        <div className="text-[11px] text-t3 text-center py-[6px]">No active streams</div>
      )}
    </div>
  );
}
