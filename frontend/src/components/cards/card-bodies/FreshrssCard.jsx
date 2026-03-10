import StatBox, { StatRow } from '../../ui/StatBox';

export default function FreshrssCard({ data }) {
  const articles = data.recent_articles || [];
  return (
    <>
      <StatRow>
        <StatBox label="Unread" value={data.unread_count ?? '—'} accent />
        <StatBox label="Feeds" value={data.total_feeds ?? '—'} muted />
        <StatBox label={'\u2605 Starred'} value={data.starred_count ?? '—'} muted />
      </StatRow>
      {articles.length > 0 && (
        <div className="space-y-[5px]">
          {articles.slice(0, 3).map((a, i) => (
            <div key={a.id ?? i} className="flex items-baseline gap-[6px] min-w-0 overflow-hidden">
              <span className="text-[10px] text-t3 shrink-0 max-w-[70px] truncate">{a.feed}</span>
              <span className="text-[11px] text-t2 truncate">{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
