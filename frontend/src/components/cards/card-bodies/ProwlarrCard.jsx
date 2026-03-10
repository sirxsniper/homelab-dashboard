import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { ItemList, ItemRow } from '../../ui/ItemList';
import { fmt, fmtMs } from '../../../utils/fmt';

export default function ProwlarrCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Indexers" value={fmt(data.indexers)} accent />
        <StatBox label="Enabled" value={<span className="text-green-400">{fmt(data.enabled)}</span>} />
        <StatBox label="Failed" value={<span className={data.failed > 0 ? 'text-red' : ''}>{fmt(data.failed || 0)}</span>} />
      </StatRow>

      <StatRow>
        <StatBox label="Queries" value={<AnimatedNumber value={data.queries || 0} format={v => fmt(Math.round(v))} />} small />
        <StatBox label="Grabs" value={fmt(data.grabs)} small />
        <StatBox label="Avg Response" value={fmtMs(data.avg_response)} small />
      </StatRow>

      {data.indexer_list?.length > 0 && (
        <>
          <div className="section-label">Indexers</div>
          <ItemList>
            {data.indexer_list.slice(0, 5).map((idx, i) => (
              <ItemRow
                key={i}
                name={idx.name}
                dot={idx.enabled !== false && !idx.failed ? 'green' : 'red'}
                value={idx.response_time != null ? fmtMs(idx.response_time) : '—'}
              />
            ))}
          </ItemList>
        </>
      )}
    </div>
  );
}
