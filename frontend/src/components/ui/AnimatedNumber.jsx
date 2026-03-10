import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 800 }) {
  const [display, setDisplay] = useState(typeof value === 'number' ? value : 0);
  const prevRef = useRef(typeof value === 'number' ? value : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = typeof value === 'number' ? value : parseFloat(value) || 0;
    prevRef.current = to;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const update = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{format(display)}</>;
}
