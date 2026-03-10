const dotClass = {
  online:   'bg-green animate-glowPulse',
  degraded: 'bg-amber',
  offline:  'bg-red',
  unknown:  'bg-t3',
};

export default function StatusPill({ status = 'unknown' }) {
  const dc = dotClass[status] || dotClass.unknown;
  return (
    <span className="inline-flex items-center gap-[5px] shrink-0">
      <span className={`w-[6px] h-[6px] rounded-full ${dc}`} />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-t3">
        {status}
      </span>
    </span>
  );
}
