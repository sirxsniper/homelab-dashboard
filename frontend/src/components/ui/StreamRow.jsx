export default function StreamRow({ title, sub }) {
  return (
    <div className="str py-[8px] px-[10px] bg-s2 rounded-[var(--radius-inner)] mb-[4px] transition-colors">
      <div className="flex items-center gap-[7px]">
        <span className="w-[5px] h-[5px] rounded-full bg-red animate-redPulse shrink-0" />
        <span className="text-[13px] text-t truncate">{title}</span>
      </div>
      {sub && <div className="text-[11px] text-t3 pl-[12px]">{sub}</div>}
    </div>
  );
}
