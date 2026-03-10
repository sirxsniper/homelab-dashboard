import StatBox, { StatRow } from '../../ui/StatBox';
import { fmtMs } from '../../../utils/fmt';

const fmtUptime = (s) => { if (!s) return '—'; const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s%3600)/60)}m`; };

export default function NotifiarrCard({ data }) {
  return (
    <StatRow>
      <StatBox label="Status" value={data.status || 'unknown'} />
      <StatBox label="Uptime" value={fmtUptime(data.uptime)} small />
      <StatBox label="Response" value={fmtMs(data.response_time)} small />
    </StatRow>
  );
}
