import StatBox, { StatRow } from '../../ui/StatBox';
import CardFooter from '../../ui/CardFooter';

export default function VaultwardenCard({ data }) {
  if (data.users != null) {
    return (
      <div>
        <StatRow>
          <StatBox label="Users" value={data.users || 0} accent />
          <StatBox label="Items" value={data.items || 0} />
          <StatBox label="Orgs" value={data.organizations || 0} />
          <StatBox label="2FA" value={`${data.twofa_pct || 0}%`} />
        </StatRow>
        {data.admin_error && (
          <div className="text-[11px] text-red px-[2px] mb-[4px]">{data.admin_error}</div>
        )}
        <CardFooter
          left={`${data.twofa_users || 0}/${data.users || 0} users with 2FA`}
          right={`${data.response_time || 0}ms`}
        />
      </div>
    );
  }

  return (
    <div>
      <StatRow>
        <StatBox label="Status" value={data.status || 'unknown'} />
        <StatBox label="Response" value={`${data.response_time || 0}ms`} small />
      </StatRow>
      {data.admin_error && (
        <div className="text-[11px] text-red px-[2px] mt-[4px]">{data.admin_error}</div>
      )}
      <CardFooter left="Add admin token for full stats" />
    </div>
  );
}
