import StatBox, { StatRow } from '../../ui/StatBox';
import { ItemList, ItemRow } from '../../ui/ItemList';
import { fmt } from '../../../utils/fmt';

export default function OllamaCard({ data }) {
  const runningNames = new Set((data.running || []).map(r => r.name || r.model));

  return (
    <div>
      <StatRow>
        <StatBox label="Models" value={fmt(data.model_count || data.models?.length || 0)} accent />
        <StatBox label="Running" value={<span className={data.running?.length > 0 ? 'text-amber' : ''}>{fmt(data.running?.length || 0)}</span>} />
        <StatBox label="Version" value={data.version || '—'} muted truncate />
      </StatRow>

      {data.models?.length > 0 && (
        <>
          <div className="section-label">Models</div>
          <ItemList>
            {data.models.slice(0, 5).map((m, i) => (
              <ItemRow
                key={i}
                name={m.name || m.model}
                dot={runningNames.has(m.name || m.model) ? 'amber' : undefined}
                tag={m.size || m.parameter_size}
              />
            ))}
          </ItemList>
        </>
      )}
    </div>
  );
}
