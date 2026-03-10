import StatBox, { StatRow } from '../../ui/StatBox';

export default function OpenWebuiCard({ data }) {
  return (
    <>
      <StatRow>
        <StatBox label="Models" value={data.models_count ?? '—'} />
        <StatBox label="Chats" value={data.chats_count ?? '—'} />
        <StatBox label="Users" value={data.users_total ?? '—'} />
      </StatRow>
      <StatRow>
        <StatBox label="Knowledge" value={data.knowledge_count ?? 0} small />
        <StatBox label="Prompts" value={data.prompts_count ?? 0} small />
        <StatBox label="Tools" value={data.tools_count ?? 0} small />
      </StatRow>
    </>
  );
}
