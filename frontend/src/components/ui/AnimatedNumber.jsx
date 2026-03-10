import { useEffect, useRef, useState, memo } from 'react';

export default memo(function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 600 }) {
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
    let lastSet = 0;

    const update = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = from + (to - from) * ease;

      // Throttle state updates to every 50ms
      if (progress >= 1 || time - lastSet > 50) {
        setDisplay(val);
        lastSet = time;
      }

      if (progress < 1) rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{format(display)}</>;
});
