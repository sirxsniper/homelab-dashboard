import { useMemo, useId, memo } from 'react';

export default memo(function Sparkline({ data = [], color = 'var(--color-red)', height = 36 }) {
  const id = useId();
  const gradId = `spark-${id}`;

  const dataKey = data.join(',');

  const { line, area, last } = useMemo(() => {
    if (!data.length || data.length < 2) return { line: null, area: null, last: null };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1 || 1);
    const points = data.map((v, i) => ({
      x: i * step,
      y: height - ((v - min) / range) * (height * 0.85) - (height * 0.07),
    }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
    return { line, area, last: points[points.length - 1] };
  }, [dataKey, height]);

  if (!line) return null;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.25 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="2" style={{ fill: color }} />
    </svg>
  );
});
