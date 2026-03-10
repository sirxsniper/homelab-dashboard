import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function NextcloudCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Files" value={<AnimatedNumber value={data.files || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Users" value={data.users_total || data.active_users_24h || 0} />
        <StatBox label="Shares" value={fmt(data.shares)} />
        <StatBox label="Storage" value={data.storage_free ? `${data.storage_free} free` : '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="CPU 1m" value={data.cpu_load != null ? `${data.cpu_load}%` : '—'} small />
        <StatBox label="DB" value={data.db_size || '—'} small />
        <StatBox label="Apps" value={data.apps_installed || 0} small />
        {data.apps_updates > 0 && <StatBox label="Updates" value={data.apps_updates} valueColor="amber" small />}
      </StatRow>

      {data.memory_pct != null && (
        <ProgressBar
          label={`Memory${data.memory_used && data.memory_total ? ` (${data.memory_used} / ${data.memory_total})` : ''}`}
          pct={data.memory_pct}
          value={`${data.memory_pct.toFixed(1)}%`}
          color={data.memory_pct > 90 ? 'red' : data.memory_pct > 80 ? 'amber' : undefined}
        />
      )}
    </div>
  );
}
