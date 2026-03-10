import StatBox, { StatRow } from '../../ui/StatBox';
import { fmtMs } from '../../../utils/fmt';

export default function OpenWebuiCard({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} />
      <StatBox label="Models" value={data.models || '—'} />
      <StatBox label="Response" value={fmtMs(data.response_time)} small />
    </StatRow>
  );
}
