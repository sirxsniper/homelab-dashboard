import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

export default function ImmichCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Photos" value={<AnimatedNumber value={data.photos || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Videos" value={fmt(data.videos)} />
        <StatBox label="Storage" value={data.storage_used || data.storage || '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="Users" value={fmt(data.users)} small />
        <StatBox label="Albums" value={fmt(data.albums)} small />
        <StatBox label="Version" value={data.version || '—'} small muted truncate />
      </StatRow>
    </div>
  );
}
