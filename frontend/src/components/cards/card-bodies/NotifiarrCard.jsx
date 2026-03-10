import StatBox, { StatRow } from '../../ui/StatBox';

const fmtUptime = (s) => {
  if (!s) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}m`;
};

export default function NotifiarrCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Integrations" value={data.integrations_total || 0} accent />
        <StatBox label="Checks" value={data.services_total || 0} />
        <StatBox label="Healthy" value={data.services_up || 0} />
        {data.services_down > 0 && <StatBox label="Down" value={data.services_down} valueColor="red" />}
      </StatRow>

      <StatRow>
        {data.uptime && <StatBox label="Uptime" value={fmtUptime(data.uptime)} small />}
        {data.version && <StatBox label="Version" value={data.version} small />}
      </StatRow>

      {data.services?.length > 0 && (
        <div className="flex flex-wrap gap-[4px] mt-[8px]">
          {data.services.map((svc, i) => (
            <span key={i} className={`text-[10px] px-[6px] py-[2px] rounded-[4px] font-mono truncate max-w-[140px] ${
              svc.state === 'ok'
                ? 'bg-gd text-green border border-gb'
                : 'bg-rd text-red border border-rb'
            }`}>
              {svc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
