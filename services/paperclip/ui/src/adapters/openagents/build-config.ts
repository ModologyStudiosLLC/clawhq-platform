import type { CreateConfigValues } from "../../components/AgentConfigForm";

export function buildOpenAgentsConfig(
  v: CreateConfigValues,
): Record<string, unknown> {
  const ac: Record<string, unknown> = {};

  // API key — store reference to env var if the user typed one, otherwise inline
  if (v.apiKey) {
    ac.apiKey = v.apiKey.startsWith("oa_") ? v.apiKey : v.apiKey;
  }

  if (v.networkUrl) ac.networkUrl = v.networkUrl;

  if (v.model) ac.model = v.model;

  if (v.agentHandle) {
    const handle = (v.agentHandle as string).trim();
    if (handle) ac.agentHandle = handle.startsWith("@") ? handle : `@${handle}`;
  }

  ac.timeoutSec = 300;
  ac.graceSec = 15;

  return ac;
}
