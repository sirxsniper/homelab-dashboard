export function fmt(n) {
  if (n == null) return '—';
  if (typeof n !== 'number') return String(n);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function fmtPct(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

export function fmtMs(n) {
  if (n == null) return '—';
  if (n < 1) return `${n.toFixed(2)}ms`;
  return `${Math.round(n)}ms`;
}

export function fmtGb(n) {
  if (n == null || n === 0) return '—';
  return `${Number(n).toFixed(1)} GB`;
}

export function fmtTb(n) {
  if (n == null || n === 0) return '—';
  return `${Number(n).toFixed(1)} TB`;
}

export function fmtSpeed(mbps) {
  if (mbps == null) return '—';
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gb/s`;
  if (mbps >= 1) return `${mbps.toFixed(1)} Mb/s`;
  return `${(mbps * 1000).toFixed(0)} Kb/s`;
}
