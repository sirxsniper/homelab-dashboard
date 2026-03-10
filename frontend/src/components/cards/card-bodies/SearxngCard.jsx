import StatBox, { StatRow } from '../../ui/StatBox';
import { fmtMs } from '../../../utils/fmt';

export default function SearxngCard({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} />
      <StatBox label="Engines" value={data.engines || '—'} />
      <StatBox label="Response" value={fmtMs(data.response_time)} small />
    </StatRow>
  );
}
