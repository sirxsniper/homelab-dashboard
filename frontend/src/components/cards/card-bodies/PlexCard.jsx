import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';
import { fmt } from '../../../utils/fmt';

export default function PlexCard({ data }) {

  // Pick the best third stat: music > episodes > libraries
  let thirdLabel, thirdValue;
  if (data.music != null && data.music > 0) {
    thirdLabel = 'Music'; thirdValue = fmt(data.music);
  } else if (data.albums != null && data.albums > 0) {
    thirdLabel = 'Albums'; thirdValue = fmt(data.albums);
  } else if (data.episodes != null && data.episodes > 0) {
    thirdLabel = 'Episodes'; thirdValue = fmt(data.episodes);
  } else if (data.libraries != null && data.libraries > 0) {
    thirdLabel = 'Libraries'; thirdValue = fmt(data.libraries);
  } else {
    thirdLabel = 'Albums'; thirdValue = '0';
  }

  return (
    <div>
      {/* Stat row with visual hierarchy */}
      <StatRow>
        <StatBox label="Movies" value={fmt(data.movies)} accent />
        <StatBox label="Shows" value={fmt(data.shows)} muted />
        <StatBox label={thirdLabel} value={thirdValue} muted />
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
                      <div className="text-[11px] text-t2 truncate">{s.title}</div>
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
        left={data.version ? `v${data.version.split('-')[0].split('.').slice(0, 3).join('.')}` : undefined}
        right={
          data.active_streams > 0
            ? `${data.active_streams} streaming`
            : data.plex_pass
              ? '⭐ Plex Pass'
              : data.libraries ? `${data.libraries} libraries` : undefined
        }
      />
    </div>
  );
}
