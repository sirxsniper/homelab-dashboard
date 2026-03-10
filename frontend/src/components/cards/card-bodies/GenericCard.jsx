import StatBox, { StatRow } from '../../ui/StatBox';
import { fmtMs } from '../../../utils/fmt';

export default function GenericCard({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} />
      {data.response_time != null && <StatBox label="Response" value={fmtMs(data.response_time)} small />}
      {data.http_status && <StatBox label="HTTP" value={data.http_status} small />}
    </StatRow>
  );
}
