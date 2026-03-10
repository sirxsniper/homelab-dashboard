import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';
import { fmt } from '../../../utils/fmt';

export default function BazarrCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Wanted Series" value={<span className={data.wanted_series > 0 ? 'text-amber' : ''}>{fmt(data.wanted_series || 0)}</span>} accent />
        <StatBox label="Wanted Movies" value={<span className={data.wanted_movies > 0 ? 'text-amber' : ''}>{fmt(data.wanted_movies || 0)}</span>} />
        <StatBox label="Providers" value={fmt(data.providers)} />
      </StatRow>

      {data.history?.length > 0 && (
        <>
          <div className="section-label">Recent</div>
          <div className="flex flex-col gap-[3px] mb-[8px]">
            {data.history.slice(0, 3).map((item, i) => (
              <div key={i} className="ir py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <span className="text-[12px] text-t truncate block">{item.title || item.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <CardFooter left={data.version ? `v${data.version}` : undefined} />
    </div>
  );
}
