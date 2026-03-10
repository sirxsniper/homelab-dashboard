import StatBox, { StatRow } from '../../ui/StatBox';

export default function PortainerCard({ data }) {
  if (data.status === 'offline' || data.error) {
    return (
      <div className="text-center py-[16px] text-t3 text-[13px]">
        Host unreachable
      </div>
    );
  }

  return (
    <div>
      <div className="text-[13px] text-t2 mb-[10px] font-mono">
        <span style={{ color: 'var(--accent)' }}>{data.running || 0}</span> running · {data.stopped || 0} stopped
      </div>
      <StatRow>
        <StatBox label="Stacks" value={data.stacks || 0} small />
        <StatBox label="Images" value={data.images || 0} small />
        <StatBox label="Volumes" value={data.volumes || 0} small />
        {data.networks > 0 && <StatBox label="Networks" value={data.networks} small />}
      </StatRow>

      {data.container_list?.length > 0 && (
        <>
          <div className="section-label">Containers</div>
          <div className="flex flex-col gap-[3px] mb-[4px]">
            {data.container_list.slice(0, 6).map((c, i) => (
              <div key={i} className="ir flex items-center gap-[8px] py-[5px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
                <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${c.state === 'running' ? 'bg-green' : 'bg-red'}`} />
                <span className="text-[12px] text-t truncate flex-1 min-w-0">{c.name}</span>
                {c.status && <span className="text-[10px] text-t3 font-mono shrink-0 truncate max-w-[100px]">{c.status}</span>}
              </div>
            ))}
            {data.container_list.length > 6 && (
              <div className="text-[10px] text-t3 text-center mt-[2px]">+{data.container_list.length - 6} more</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
