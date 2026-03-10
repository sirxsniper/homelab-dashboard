import StatBox, { StatRow } from '../../ui/StatBox';
import AlertBadge from '../../ui/AlertBadge';

export default function VaultwardenCard({ data }) {
  return (
    <div>
      <StatRow>
        <StatBox label="Items" value={data.items || 0} />
        <StatBox label="Users" value={data.users || 0} />
        <StatBox label="Collections" value={data.collections || 0} />
      </StatRow>
      {data.failed_logins > 0 && (
        <AlertBadge variant="error" label="Failed logins" value={data.failed_logins} />
      )}
      <div className="flex items-center justify-between py-[6px] px-[10px] bg-s2 rounded-[var(--radius-inner)] text-[12px]">
        <span className="text-t3">2FA enforcement</span>
        <span className={`font-mono ${data.twofa_enabled ? 'text-green' : 'text-t3'}`}>
          {data.twofa_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
}
