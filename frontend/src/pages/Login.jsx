import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.requires_2fa) {
        navigate('/2fa', { state: { partial_token: result.partial_token } });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg z-200 flex items-center justify-center">
      <div className="w-full max-w-[364px] px-[16px]">
        {/* Brand */}
        <div className="text-center mb-[24px]">
          <div className="w-[44px] h-[44px] bg-s2 border border-bd2 rounded-[12px] flex items-center justify-center text-[20px] mx-auto mb-[12px]">
            &#x2B21;
          </div>
          <div className="text-[20px] font-semibold tracking-[-0.4px]">Homelab Dashboard</div>
          <div className="text-[13px] text-t2 mt-[4px]">Sign in to your dashboard</div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-s1 border border-bd2 rounded-[18px] p-[26px]">
          <div className="mb-[16px]">
            <label className="block text-[11px] font-medium text-t3 uppercase tracking-[0.04em] mb-[6px]">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[10px] px-[13px] text-[14px] text-t outline-none focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
            />
          </div>

          <div className="mb-[20px]">
            <label className="block text-[11px] font-medium text-t3 uppercase tracking-[0.04em] mb-[6px]">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[10px] px-[13px] text-[14px] text-t outline-none focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
            />
          </div>

          {error && (
            <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mb-[16px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[11px] bg-t text-bg rounded-[var(--radius-inner)] text-[14px] font-semibold tracking-[-0.15px] hover:opacity-88 disabled:opacity-35 transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-[12px] py-[10px] px-[13px] bg-s2 rounded-[var(--radius-inner)] text-[12px] text-t3 text-center">
          Self-hosted homelab monitoring dashboard
        </div>
      </div>
    </div>
  );
}
