import StatBox, { StatRow } from '../../ui/StatBox';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt } from '../../../utils/fmt';

const statusColor = { Pending: 'text-amber', Approved: 'text-green', Declined: 'text-red', Processing: 'text-blue' };

export default function SeerrCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Pending" value={<span className={data.pending_count > 0 ? 'text-amber' : ''}><AnimatedNumber value={data.pending_count || 0} /></span>} accent />
        <StatBox label="Requests" value={fmt(data.total_requests || 0)} />
        <StatBox label="Media" value={fmt(data.total_media || 0)} small />
      </StatRow>

      {/* Last 3 requests */}
      {data.recent?.length > 0 && (
        <div className="flex flex-col gap-[3px]">
          {data.recent.slice(0, 3).map((r, i) => (
            <div key={r.id || i} className="ir flex items-center gap-[8px] py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
              {r.poster && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${r.poster}`}
                  alt=""
                  className="w-[28px] h-[42px] rounded-[4px] object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-t truncate leading-tight">{r.title}</div>
                <div className="flex items-center gap-[6px] mt-[2px]">
                  <span className="text-[10px] text-t3">{r.type}{r.is4k ? ' · 4K' : ''}</span>
                  <span className={`text-[10px] font-medium ${statusColor[r.request_status] || 'text-t3'}`}>{r.request_status}</span>
                </div>
              </div>
              <span className="text-[10px] text-t4 font-mono shrink-0">{r.time_ago}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
