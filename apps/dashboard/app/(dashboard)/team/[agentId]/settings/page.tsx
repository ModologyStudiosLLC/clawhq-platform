import { AgentSettings } from "@/components/team/agent-settings";

export default function AgentSettingsPage({ params }: { params: { agentId: string } }) {
  return <AgentSettings agentId={params.agentId} />;
}
