import StatBox, { StatRow } from '../../ui/StatBox';
import AlertBadge from '../../ui/AlertBadge';
import CardFooter from '../../ui/CardFooter';

export default function GrafanaCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Dashboards" value={data.dashboards || 0} />
        <StatBox label="Sources" value={data.datasources || 0} />
        <StatBox label="Panels" value={data.panels || 0} />
      </StatRow>
      {data.firing_alerts > 0 && (
        <AlertBadge variant="error" label="Alerts firing" value={`${data.firing_alerts} / ${data.total_alerts || 0}`} />
      )}
      <CardFooter
        left={`${data.users || 0} users`}
        right={data.version ? `v${data.version}` : undefined}
      />
    </div>
  );
}
