import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';

function formatSpeed(mbps) {
  if (mbps == null) return '—';
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gb/s`;
  return `${mbps.toFixed(0)} Mb/s`;
}

export default function Iperf3Card({ data }) {
  if (data.busy) {
    return (
      <div className="text-center py-[12px] text-t3 text-[12px]">
        Server busy — waiting for next test
      </div>
    );
  }

  if (!data.upload_mbps && !data.download_mbps) {
    return (
      <StatRow>
        <StatBox label="Status" value={data.status || 'unknown'} />
        <StatBox label="Port" value={data.port || 5201} small />
      </StatRow>
    );
  }

  return (
    <div>
      <StatRow>
        <StatBox label="Upload" value={formatSpeed(data.upload_mbps)} accent />
        <StatBox label="Download" value={formatSpeed(data.download_mbps)} />
      </StatRow>
      <CardFooter
        left={data.retransmits != null ? `${data.retransmits} retransmits` : ''}
        right={data.tested_at ? new Date(data.tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      />
    </div>
  );
}
