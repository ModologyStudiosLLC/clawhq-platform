import type { AdapterConfigFieldsProps } from "../types";
import { Field, DraftInput } from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const selectClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm placeholder:text-muted-foreground/40";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-opus-4-6",   label: "Claude Opus 4.6" },
  { id: "gpt-4o",            label: "GPT-4o" },
  { id: "gpt-4o-mini",       label: "GPT-4o Mini" },
];

export function OpenAgentsConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      {/* API Key */}
      <Field
        label="API Key"
        hint="Your OpenAgents API key. Use ${OPENAGENTS_API_KEY} to reference an environment variable."
      >
        <DraftInput
          value={
            isCreate
              ? (values!.apiKey ?? "")
              : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ apiKey: v })
              : mark("adapterConfig", "apiKey", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="${OPENAGENTS_API_KEY}"
          type="password"
        />
      </Field>

      {/* Model */}
      <Field
        label="Model"
        hint="Which model to use for agent inference via OpenAgents."
      >
        {isCreate ? (
          <select
            className={selectClass}
            value={(values!.model as string) ?? "claude-sonnet-4-6"}
            onChange={(e) => set!({ model: e.target.value })}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        ) : (
          <select
            className={selectClass}
            value={eff("adapterConfig", "model", String(config.model ?? "claude-sonnet-4-6"))}
            onChange={(e) => mark("adapterConfig", "model", e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        )}
      </Field>

      {/* Agent Handle */}
      <Field
        label="Agent Handle (optional)"
        hint="Public handle for this agent on the OpenAgents network (e.g. @my-agent). Enables other network agents to discover and delegate tasks to this agent."
      >
        <DraftInput
          value={
            isCreate
              ? (values!.agentHandle ?? "")
              : eff("adapterConfig", "agentHandle", String(config.agentHandle ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ agentHandle: v })
              : mark("adapterConfig", "agentHandle", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="@my-agent (optional)"
        />
      </Field>

      {/* Network URL (advanced) */}
      <Field
        label="Network URL (advanced)"
        hint="OpenAgents API base URL. Leave blank to use the default hosted endpoint. Override for self-hosted or staging deployments."
      >
        <DraftInput
          value={
            isCreate
              ? (values!.networkUrl ?? "")
              : eff("adapterConfig", "networkUrl", String(config.networkUrl ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ networkUrl: v })
              : mark("adapterConfig", "networkUrl", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="https://api.openagents.org/v1"
        />
      </Field>
    </>
  );
}
