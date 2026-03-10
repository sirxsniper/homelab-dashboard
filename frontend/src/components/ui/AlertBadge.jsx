export default function AlertBadge({ variant = 'warn', label, value }) {
  const color = variant === 'error' ? 'text-red' : variant === 'ok' ? 'text-green' : 'text-amber';
  return (
    <div className="ab-row flex items-center justify-between py-[7px] px-[10px] bg-s2 rounded-[var(--radius-inner)] text-[12px] mb-[6px] transition-colors">
      <span className={`font-medium ${color}`}>{label}</span>
      <span className="font-mono text-[12px] text-t2">{value}</span>
    </div>
  );
}
