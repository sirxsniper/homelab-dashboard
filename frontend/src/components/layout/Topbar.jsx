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

  const total = stats?.length || 0;
  const offline = stats?.filter(s => s.data?.error || s.data?.status === 'offline').length || 0;
  const degraded = stats?.filter(s => s.data?.status === 'degraded').length || 0;
  const waiting = stats?.filter(s => !s.data).length || 0;
  const online = total > 0 ? total - offline - degraded - waiting : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const healthPct = total > 0 ? Math.round((online / total) * 100) : 0;

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

        {/* Centre — Status summary */}
        <div className="flex items-center gap-[18px] topbar-pills">
          {/* Health ring + label */}
          <div className="flex items-center gap-[12px]">
            <HealthRing pct={healthPct} />
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-t leading-none tracking-[-0.2px]">{online}<span className="text-t3 font-normal">/{total}</span></span>
              <span className="text-[11px] text-t2 leading-tight mt-[2px]">Services Online</span>
            </div>
          </div>

          <div className="w-px h-[24px] bg-bd" />

          {/* Status counts */}
          <div className="flex items-center gap-[14px]">
            <StatusDot color="green" count={online} label="Online" />
            {degraded > 0 && <StatusDot color="amber" count={degraded} label="Degraded" />}
            {offline > 0 && <StatusDot color="red" count={offline} label="Offline" />}
          </div>
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

/* ── Health ring ── */
function HealthRing({ pct }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? 'var(--color-green)' : pct >= 80 ? 'var(--color-amber)' : 'var(--color-red)';

  return (
    <div className="relative w-[36px] h-[36px] shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36" className="block -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-s3)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" style={{ stroke: color }} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono text-t2">{pct}%</span>
    </div>
  );
}

/* ── Status dot ── */
function StatusDot({ color, count, label }) {
  const dotCls = color === 'green' ? 'bg-green' : color === 'amber' ? 'bg-amber' : 'bg-red';
  const pulseClass = color === 'red' && count > 0 ? 'animate-redPulse' : '';
  return (
    <div className="flex items-center gap-[6px]" title={`${count} ${label.toLowerCase()}`}>
      <span className={`w-[7px] h-[7px] rounded-full ${dotCls} ${pulseClass}`} />
      <span className="text-[13px] font-mono font-semibold text-t2">{count}</span>
      <span className="text-[12px] text-t3">{label}</span>
    </div>
  );
}
