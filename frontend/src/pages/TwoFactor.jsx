import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verify2fa } from '../api/auth';

export default function TwoFactor() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const partialToken = location.state?.partial_token;

  if (!partialToken) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2fa(partialToken, token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
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
          <div className="text-[20px] font-semibold tracking-[-0.4px]">Two-Factor Auth</div>
          <div className="text-[13px] text-t2 mt-[4px]">Enter the code from your authenticator app</div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-s1 border border-bd2 rounded-[18px] p-[26px]">
          <div className="mb-[20px]">
            <label className="block text-[11px] font-medium text-t3 uppercase tracking-[0.04em] mb-[6px]">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={token}
              placeholder="000000"
              onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className="w-full bg-s2 border border-bd2 rounded-[var(--radius-inner)] py-[14px] px-[13px] text-[24px] text-t font-mono text-center tracking-[0.45em] outline-none focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
            />
          </div>

          {error && (
            <div className="bg-rd text-red text-[12px] px-[10px] py-[8px] rounded-[var(--radius-inner)] mb-[16px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || token.length !== 6}
            className="w-full py-[11px] bg-t text-bg rounded-[var(--radius-inner)] text-[14px] font-semibold tracking-[-0.15px] hover:opacity-88 disabled:opacity-35 transition-opacity"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full mt-[9px] py-[8px] text-[13px] text-t3 hover:text-t transition-colors"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
