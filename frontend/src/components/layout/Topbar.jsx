import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import { getUser } from '../../store/auth';
import { useCustomise } from '../../hooks/useCustomise';

export function useDashboardName() {
  const custom = useCustomise();
  return custom.name || 'Homelab';
}

export default function Topbar({ onAdminClick, stats }) {
  const navigate = useNavigate();
  const user = getUser();
  const custom = useCustomise();
  const dashName = custom.name || 'Homelab';
  const logo = custom.logo || '';


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="topbar sticky top-0 z-100">
      <div className="topbar-glass" />

      <div className="topbar-content">
        {/* Left — Logo + Name */}
        <div className="flex items-center gap-[12px] min-w-0">
          {logo ? (
            <div className="w-[34px] h-[34px] rounded-[9px] overflow-hidden shrink-0 border border-bd2">
              <img src={logo} alt="" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="topbar-logo-fallback">
              <span className="topbar-logo-letter">{dashName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span className="text-[16px] font-semibold tracking-[-0.4px] text-t truncate">{dashName}</span>
        </div>

        {/* Centre — Date & Time */}
        <div className="topbar-pills">
          <TopbarClock />
        </div>

        {/* Right — User + actions */}
        <div className="flex items-center gap-[8px] justify-end">
          {user && (
            <div className="flex items-center gap-[7px] mr-[2px]">
              <div className="w-[26px] h-[26px] rounded-full bg-s2 border border-bd2 flex items-center justify-center text-[11px] font-semibold text-t3 uppercase">
                {(user.username || user.email || '?').charAt(0)}
              </div>
              <span className="text-[12px] text-t3 hidden xl:block">{user.username || user.email}</span>
            </div>
          )}

          {user?.role === 'admin' && (
            <button onClick={onAdminClick} className="topbar-btn group" title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-t3 group-hover:text-t transition-colors">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}

          <button onClick={handleLogout} className="topbar-btn-logout" title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── Live clock ── */
function TopbarClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-[14px]">
      <span className="text-[20px] font-mono font-bold tracking-[-0.5px] text-t leading-none">
        {h}<span className="topbar-clock-sep">:</span>{m}<span className="text-t3 text-[14px] ml-[2px]">{s}</span>
      </span>
      <div className="w-px h-[20px] bg-bd" />
      <span className="text-[12px] text-t2 leading-none">
        {days[now.getDay()]}, {now.getDate()} {months[now.getMonth()]}
      </span>
    </div>
  );
}
