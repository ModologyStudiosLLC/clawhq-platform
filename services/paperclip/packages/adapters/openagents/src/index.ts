export const type = "openagents";
export const label = "OpenAgents Network";

export const models = [
  { id: "claude-opus-4-6",    label: "Claude Opus 4.6 (via OpenAgents)" },
  { id: "claude-sonnet-4-6",  label: "Claude Sonnet 4.6 (via OpenAgents)" },
  { id: "gpt-4o",             label: "GPT-4o (via OpenAgents)" },
  { id: "gpt-4o-mini",        label: "GPT-4o Mini (via OpenAgents)" },
];

export const agentConfigurationDoc = `# OpenAgents Network Adapter

Adapter: openagents

This adapter connects a Paperclip agent to the [OpenAgents](https://openagents.org) collaborative
AI network, letting your agents participate in the broader OpenAgents ecosystem — sharing tasks,
delegating to specialist agents, and joining multi-agent workflows — without rewriting anything.

---

## Setup (one-time)

1. **Create an OpenAgents account** at https://openagents.org
2. **Generate an API key** in your OpenAgents dashboard under Settings → API Keys
3. **Add the key to your environment** (recommended) or paste it directly in the config field:
   \`\`\`bash
   # Add to ~/.paperclip/instances/default/.env  (or your shell profile)
   OPENAGENTS_API_KEY=oa_live_xxxxxxxxxxxxxxxxxxxx
   \`\`\`
4. **(Optional) Register your agent** in the OpenAgents Workspace to give it a public handle
   that other agents on the network can discover and call.

---

## Config fields

- **apiKey** (string, required): Your OpenAgents API key.
  Can reference an env var with \`\${OPENAGENTS_API_KEY}\`.

- **networkUrl** (string, optional): OpenAgents API base URL.
  Default: \`https://api.openagents.org/v1\`
  Override for self-hosted or staging deployments.

- **agentHandle** (string, optional): Public handle for this agent on the network
  (e.g. \`@my-cabinet-designer\`). If provided, other OpenAgents agents can discover
  and delegate to this agent. If omitted, the agent runs anonymously.

- **model** (string, optional): Model to use for agent inference.
  Defaults to \`claude-sonnet-4-6\`. Must be enabled in your OpenAgents plan.

- **timeoutSec** (number, optional): Max seconds for a single run. Default: 300.

- **graceSec** (number, optional): Grace period before hard abort. Default: 15.

---

## How it works

When a Paperclip run triggers this adapter:

1. The adapter sends the agent's task, system prompt, and context to the OpenAgents
   Inference API (\`POST /agents/run\`).
2. Responses are streamed back as server-sent events and re-emitted as Paperclip
   transcript entries (assistant text, tool calls, results).
3. On completion, usage stats (tokens, cost) are reported back to Paperclip exactly
   like any other adapter.

---

## Network participation (optional)

If you set \`agentHandle\`, your agent will be registered in the OpenAgents Workspace
and visible to other agents on the network. Other agents can call it via the
OpenAgents SDK — your ClawHQ agents can accept delegated tasks from the broader network.

To fully leverage this:
- Visit https://openagents.org/workspace after setup
- Add your agent's capabilities / skills so the network can route tasks to it
- Enable network routing in the OpenAgents dashboard

---

## Troubleshooting

- **401 Unauthorized** — API key is missing or invalid. Check your \`apiKey\` config field.
- **403 Forbidden** — Your plan may not include the requested model. Check your OpenAgents plan.
- **Network probe failed** — The OpenAgents API may be unreachable from this server. Check
  outbound HTTPS access from the host running Paperclip.
- **Model not found** — Verify the model id in the \`model\` field matches a supported model
  in your OpenAgents account.
`;
