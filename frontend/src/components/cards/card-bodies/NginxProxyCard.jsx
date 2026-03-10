import StatBox, { StatRow } from '../../ui/StatBox';
import AlertBadge from '../../ui/AlertBadge';
import CardFooter from '../../ui/CardFooter';
import { fmt } from '../../../utils/fmt';

export default function NginxProxyCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Proxies" value={fmt(data.proxy_hosts)} accent />
        <StatBox label="CERTS" value={fmt(data.certificates)} />
        <StatBox label="SSL Hosts" value={fmt(data.ssl_hosts)} />
      </StatRow>

      <StatRow>
        <StatBox label="REDIR" value={fmt(data.redirects)} small />
        <StatBox label="STREAMS" value={fmt(data.streams_count ?? data.streams)} small />
        <StatBox label="ERRORS" value={fmt(data.dead_hosts)} small />
      </StatRow>

      {data.expiring_soon > 0 && (
        <AlertBadge variant="warn" label="SSL expiring soon" value={`${data.expiring_soon} cert${data.expiring_soon !== 1 ? 's' : ''}`} />
      )}

      <CardFooter
        left={data.bandwidth || undefined}
        right={[
          data.redirects ? `${data.redirects} redirect${data.redirects !== 1 ? 's' : ''}` : null,
          data.streams ? `${data.streams} stream${data.streams !== 1 ? 's' : ''}` : null,
        ].filter(Boolean).join(' · ') || undefined}
      />
    </div>
  );
}
