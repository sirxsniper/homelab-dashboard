import StatBox, { StatRow } from '../../ui/StatBox';
import Sparkline from '../../ui/Sparkline';
import CardFooter from '../../ui/CardFooter';

export default function SpeedtestTrackerCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Download" value={<span className="text-green-400">{data.download_mbps ? `${data.download_mbps} Mbps` : '—'}</span>} accent />
        <StatBox label="Upload" value={<span className="text-blue-400">{data.upload_mbps ? `${data.upload_mbps} Mbps` : '—'}</span>} />
        <StatBox label="Ping" value={data.ping_ms ? `${data.ping_ms}ms` : '—'} />
      </StatRow>

      <StatRow>
        <StatBox label="Avg DL" value={data.avg_download ? `${data.avg_download} Mbps` : '—'} small />
        <StatBox label="Avg UL" value={data.avg_upload ? `${data.avg_upload} Mbps` : '—'} small />
        <StatBox label="Last Test" value={data.last_test_ago || '—'} small />
      </StatRow>

      {data.history?.length > 1 && (
        <div className="mb-[8px]">
          <Sparkline data={data.history} color="var(--color-green, #34d399)" />
        </div>
      )}

      <CardFooter
        left={data.server || undefined}
        right={data.test_count ? `${data.test_count} tests` : undefined}
      />
    </div>
  );
}
