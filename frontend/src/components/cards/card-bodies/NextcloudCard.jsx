import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function NextcloudCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Files" value={<AnimatedNumber value={data.files || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Active" value={fmt(data.active_users_24h)} />
        <StatBox label="Storage" value={data.storage_free ? `${data.storage_free} free` : '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="Shares" value={fmt(data.shares)} small />
        <StatBox label="CPU" value={data.cpu_load != null ? `${data.cpu_load}%` : '—'} small />
        <StatBox label="DB" value={data.db_size || '—'} small />
      </StatRow>

      {data.memory_pct != null && (
        <ProgressBar
          label="Memory"
          pct={data.memory_pct}
          value={`${data.memory_pct.toFixed(1)}%`}
          color={data.memory_pct > 90 ? 'red' : data.memory_pct > 80 ? 'amber' : undefined}
        />
      )}
    </div>
  );
}
