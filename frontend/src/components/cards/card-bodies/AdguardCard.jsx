import { useMutation, useQueryClient } from '@tanstack/react-query';
import StatBox, { StatRow } from '../../ui/StatBox';
import ProgressBar from '../../ui/ProgressBar';
import Sparkline from '../../ui/Sparkline';
import ActionButton, { ActionRow } from '../../ui/ActionButton';
import { triggerAction } from '../../../api/apps';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { fmt, fmtPct } from '../../../utils/fmt';

export default function AdguardCard({ data, appId, appUrl }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => triggerAction(appId, { action: 'toggle_filtering' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stats'] }),
  });

  const blockPct = data.blocked_percentage || 0;

  return (
    <div>
      {/* Row 1 — primary stats */}
      <StatRow>
        <StatBox label="Queries" value={<AnimatedNumber value={data.dns_queries || 0} format={v => fmt(Math.round(v))} />} accent />
        <StatBox label="Blocked" value={fmt(data.blocked_queries)} />
        <StatBox label="BLK %" value={fmtPct(blockPct)} />
      </StatRow>

      {/* Row 2 — secondary stats */}
      <StatRow>
        <StatBox label="Latency" value={`${Math.round(data.avg_processing_time || 0)}ms`} small />
        <StatBox label="Rules" value={fmt(data.rules_count ?? 0)} small />
        <StatBox label="Clients" value={data.clients || 0} small />
      </StatRow>

      <ProgressBar pct={blockPct} label="" value="" />

      {data.query_history?.length > 1 && (
        <div className="mb-[8px]">
          <Sparkline data={data.query_history} color="var(--accent, #34d399)" />
        </div>
      )}

      <ActionRow>
        <ActionButton
          label={toggle.isPending ? '...' : data.filtering_enabled ? 'Pause DNS' : 'Resume DNS'}
          danger={data.filtering_enabled}
          onClick={(e) => { e.stopPropagation(); toggle.mutate(); }}
          disabled={toggle.isPending}
        />
      </ActionRow>
    </div>
  );
}
