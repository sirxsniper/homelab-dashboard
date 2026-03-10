export function ItemList({ children }) {
  return <div className="flex flex-col gap-[3px] mb-[10px]">{children}</div>;
}

export function ItemRow({ name, sub, tag, value, dot, valueColor }) {
  const dotCls = dot === 'green' || dot === 'blue' ? 'opacity-100' : dot === 'red' ? 'bg-red opacity-100' : dot === 'amber' ? 'bg-amber opacity-100' : 'opacity-30';
  const dotStyle = (dot === 'green' || dot === 'blue') ? { background: 'var(--accent, #60a5fa)' } : {};
  const vc = valueColor === 'red' ? 'text-red' : valueColor === 'amber' ? 'text-amber' : 'text-t2';
  return (
    <div className="ir flex items-center justify-between py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] transition-colors">
      <div className="flex items-center gap-[8px] min-w-0 flex-1">
        {dot && <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${dotCls}`} style={dotStyle} />}
        <div className="min-w-0 flex-1">
          <span className="text-[13px] text-t2 truncate block">{name}</span>
          {sub && <span className="text-[11px] text-t3 truncate block mt-[1px]">{sub}</span>}
        </div>
        {tag && (
          <span className="text-[9px] text-t3 bg-s3 px-[5px] py-[1px] rounded-[4px] font-mono shrink-0 uppercase">
            {tag}
          </span>
        )}
      </div>
      <span className={`text-[11px] font-mono shrink-0 ml-2 ${vc}`}>
        {value}
      </span>
    </div>
  );
}
