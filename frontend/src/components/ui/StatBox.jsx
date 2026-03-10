export default function StatBox({ label, value, sub, small, large, primary, muted, truncate, accent }) {
  const sizeClass = truncate ? 'text-[11px] tracking-normal'
    : small ? 'text-[15px]'
    : primary ? 'text-[24px]'
    : large ? 'text-[28px]'
    : 'text-[17px]';
  const colorClass = accent ? 'text-[var(--accent)]' : muted ? 'text-t2' : 'text-t';
  return (
    <div className="st flex-1 bg-s2 rounded-[var(--radius-inner)] p-[10px_11px] min-w-0 overflow-hidden transition-colors">
      <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-medium text-t3 uppercase tracking-[0.07em] mb-[5px]">{label}</div>
      <div className={`font-semibold leading-[1.1] tracking-[-0.4px] whitespace-nowrap overflow-hidden text-ellipsis ${colorClass} ${sizeClass} ${truncate ? '' : 'font-mono'}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-t3 mt-[3px] font-normal tracking-normal whitespace-nowrap overflow-hidden text-ellipsis">{sub}</div>}
    </div>
  );
}

export function StatRow({ children }) {
  return <div className="flex gap-[7px] mb-[13px] items-stretch">{children}</div>;
}
