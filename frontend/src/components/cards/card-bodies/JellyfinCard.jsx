import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';
import { fmt } from '../../../utils/fmt';

export default function JellyfinCard({ data }) {
  return (
    <div>
      {/* Stat row with visual hierarchy */}
      <StatRow>
        <StatBox label="Movies" value={fmt(data.movies)} accent />
        {data.series > 0 && <StatBox label="Shows" value={fmt(data.series)} muted />}
        {data.songs > 0 ? <StatBox label="Tracks" value={fmt(data.songs)} muted /> : data.libraries ? <StatBox label="Libraries" value={data.libraries} muted /> : null}
      </StatRow>

      {/* Active streams */}
      {data.streams?.length > 0 && (
        <>
          <div className="section-label">Streaming Now</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.streams.map((s, i) => (
              <div key={i} className="ir py-[7px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[7px] min-w-0 flex-1">
                    <span className="w-[5px] h-[5px] rounded-full bg-green-400 animate-greenPulse shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12px] text-t font-semibold truncate">{s.user}</div>
                      <div className="text-[11px] text-t2 truncate">{s.title}{s.year ? ` (${s.year})` : ''}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-[8px]">
                    <div className="flex items-center gap-[4px] justify-end">
                      {s.quality && <span className="text-[9px] text-t3 bg-s3 px-[5px] py-[1px] rounded-[3px] font-mono uppercase">{s.quality}</span>}
                      {s.transcoding && <span className="text-[9px] text-amber font-mono">⚡</span>}
                    </div>
                    <div className={`text-[10px] font-mono mt-[2px] ${s.transcoding ? 'text-amber' : 'text-t3'}`}>
                      {s.transcoding ? 'transcode' : 'direct'}
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

      <CardFooter
        left={data.version ? `v${data.version}` : undefined}
        right={data.active_streams > 0 ? `${data.active_streams} streaming` : data.libraries ? `${data.libraries} libraries` : undefined}
      />
    </div>
  );
}
