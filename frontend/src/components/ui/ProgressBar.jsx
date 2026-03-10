export default function ProgressBar({ label, value, pct, color }) {
  const percent = pct != null ? pct : (typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'string' ? value : (typeof percent === 'number' ? `${percent.toFixed(1)}%` : percent);
  // Use accent colour by default, allow override
  const barColor = color === 'red' ? 'bg-red' : color === 'amber' ? 'bg-amber' : '';
  const barStyle = !barColor ? { background: 'var(--accent, #60a5fa)' } : {};
  return (
    <div className="mb-[10px]">
      <div className="flex justify-between mb-[4px]">
        <span className="text-[11px] text-t3 font-medium">{label}</span>
        <span className="text-[11px] text-t2 font-mono">{displayValue}</span>
      </div>
      <div className="pb-t h-[4px] bg-s3 rounded-[2px] overflow-hidden transition-colors">
        <div
          className={`h-full rounded-[2px] bar-fill ${barColor}`}
          style={{ width: `${Math.min(typeof percent === 'number' ? percent : 0, 100)}%`, transition: 'width 0.5s ease', ...barStyle }}
        />
      </div>
    </div>
  );
}
