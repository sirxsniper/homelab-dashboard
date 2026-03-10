import { useState, useEffect, useRef } from 'react';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CalendarGrid({ episodes = [], type = 'sonarr' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const popoverRef = useRef(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Group episodes by date
  const byDate = {};
  for (const ep of episodes) {
    const date = type === 'sonarr' ? ep.airDate : (ep.releaseDate || '').split('T')[0];
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(ep);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Close popover on outside click
  useEffect(() => {
    if (!selectedDate) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setSelectedDate(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedDate]);

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasEps = byDate[dateStr]?.length > 0;
    const isPast = new Date(dateStr) < today;
    const isToday = dateStr === todayStr;

    // Dot color
    let dotColor = 'var(--color-blue)';
    if (type === 'radarr' && hasEps) {
      const types = byDate[dateStr].map(m => m.releaseType);
      if (types.includes('cinema')) dotColor = 'var(--color-purple)';
      else if (types.includes('digital')) dotColor = 'var(--color-blue)';
      else dotColor = 'var(--color-amber)';
    }

    cells.push(
      <div
        key={day}
        onClick={() => hasEps && !isPast ? setSelectedDate(dateStr) : null}
        className={`aspect-square rounded-[8px] bg-s2 border relative flex flex-col items-center pt-[6px]
          ${isToday ? 'border-blue' : 'border-transparent'}
          ${isPast ? 'opacity-35' : ''}
          ${hasEps && !isPast ? 'cursor-pointer hover:bg-s3' : 'cursor-default'}`}
      >
        <span className={`text-[12px] font-medium ${isToday ? 'text-blue font-bold' : 'text-t2'}`}>{day}</span>
        {hasEps && (
          <span className="w-[6px] h-[6px] rounded-full absolute bottom-[6px] left-1/2 -translate-x-1/2"
            style={{ background: dotColor }} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="flex items-center gap-[8px]">
          <button onClick={prevMonth} className="text-t3 hover:text-t text-[14px] px-[6px]">&larr;</button>
          <span className="text-[13px] font-semibold text-t">{formatMonthYear(currentDate)}</span>
          <button onClick={nextMonth} className="text-t3 hover:text-t text-[14px] px-[6px]">&rarr;</button>
        </div>
        <button onClick={goToday} className="text-[11px] text-t3 hover:text-t2 font-mono">Today</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-[4px] mb-[4px]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[10px] text-t3 font-medium uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-[4px]">
        {cells}
      </div>

      {/* Popover */}
      {selectedDate && byDate[selectedDate] && (
        <div ref={popoverRef} className="mt-[12px] bg-s3 border border-bd2 rounded-[var(--radius-inner)] p-[14px_16px] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="text-[12px] font-semibold text-t2 uppercase tracking-[0.08em] mb-[12px]">
            {formatFullDate(selectedDate)}
          </div>
          {byDate[selectedDate].map((item, i) => (
            <div key={i} className="py-[8px] border-b border-bd last:border-b-0">
              <div className="text-[13px] font-medium text-t">{type === 'sonarr' ? item.series : item.title}</div>
              <div className="text-[11px] text-t3 mt-[2px]">
                {type === 'sonarr'
                  ? `${item.episode}${item.network ? ` \u00b7 ${item.network}` : ''}`
                  : `${item.releaseType?.toUpperCase()} release`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
