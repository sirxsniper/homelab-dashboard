import { useMutation, useQueryClient } from '@tanstack/react-query';
import ProgressBar from '../../ui/ProgressBar';
import Sparkline from '../../ui/Sparkline';
import CardFooter from '../../ui/CardFooter';
import ActionButton, { ActionRow } from '../../ui/ActionButton';
import { triggerAction } from '../../../api/apps';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt, fmtPct } from '../../../utils/fmt';

export default function PiholeCard({ data, appId, appUrl }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: (action) => triggerAction(appId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stats'] }),
  });

  const isEnabled = data.filtering_enabled;
  const blockPct = data.blocked_percentage || 0;

  return (
    <div>
      <div className="mb-[12px]">
        <div className="text-[28px] font-mono font-medium tracking-[-1px]" style={{ color: 'var(--accent, #34d399)' }}>
          <AnimatedNumber value={data.dns_queries || 0} format={v => fmt(Math.round(v))} />
        </div>
        <div className="text-[11px] text-t3">queries today</div>
      </div>

      <div className="text-[13px] text-t2 mb-[10px] font-mono">
        {fmt(data.blocked_queries)} blocked · {fmtPct(blockPct)}
      </div>

      <ProgressBar label="Block rate" pct={blockPct} />

      {data.query_history?.length > 1 && (
        <div className="mb-[8px]">
          <Sparkline data={data.query_history} color="var(--accent, #34d399)" />
        </div>
      )}

      <CardFooter
        left={`Blocklist ${fmt(data.domains_on_blocklist)}`}
        right={`${data.clients_seen || 0} clients`}
      />
      <ActionRow>
        <ActionButton
          label={toggle.isPending ? '...' : isEnabled ? 'Disable 5m' : 'Enable'}
          danger={isEnabled}
          onClick={(e) => {
            e.stopPropagation();
            toggle.mutate(isEnabled ? { action: 'disable', duration: 300 } : { action: 'enable' });
          }}
          disabled={toggle.isPending}
        />
      </ActionRow>
    </div>
  );
}
