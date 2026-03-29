import { ChatInterface } from "@/components/chat/interface";

export default function AgentChatPage({ params }: { params: { agentId: string } }) {
  return <ChatInterface agentId={params.agentId} />;
}
