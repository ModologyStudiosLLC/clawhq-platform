import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";

/**
 * Transcript line shapes emitted as JSON to Paperclip's onLog stream.
 * Paperclip's UI parser reads these to build the run transcript.
 */
type TranscriptLine =
  | { type: "system"; subtype: "init"; model: string; session_id: string }
  | { type: "assistant"; message: { role: "assistant"; content: Array<{ type: "text"; text: string }> } }
  | { type: "result"; subtype: "success" | "error"; result: string; usage: { input_tokens: number; output_tokens: number }; total_cost_usd: number };

function emitLine(line: TranscriptLine): string {
  return JSON.stringify(line);
}

/**
 * Resolve a config string that may reference an environment variable.
 * Supports the ${ENV_VAR} syntax used in other Paperclip adapters.
 */
function resolveEnvRef(value: unknown, envFallback?: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return envFallback ? (process.env[envFallback] ?? "") : "";
  const match = s.match(/^\$\{([^}]+)\}$/);
  if (match) return process.env[match[1]] ?? "";
  return s;
}

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context, onLog } = ctx;

  // ── Resolve config ──────────────────────────────────────────────────────────
  const apiKey = resolveEnvRef(config.apiKey, "OPENAGENTS_API_KEY");
  const networkUrl = (
    resolveEnvRef(config.networkUrl) || "https://api.openagents.org/v1"
  ).replace(/\/$/, "");
  const model =
    typeof config.model === "string" && config.model
      ? config.model
      : "claude-sonnet-4-6";
  const agentHandle =
    typeof config.agentHandle === "string" ? config.agentHandle.trim() : null;
  const timeoutMs =
    typeof config.timeoutSec === "number" ? config.timeoutSec * 1000 : 300_000;

  if (!apiKey) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage:
        "OpenAgents API key not configured. Set apiKey in the agent config " +
        "or define the OPENAGENTS_API_KEY environment variable. " +
        "Get a key at https://openagents.org",
    };
  }

  // ── Build request payload ───────────────────────────────────────────────────
  //
  // TODO: Once you have an OpenAgents account, verify the exact request shape
  // against their API reference at https://docs.openagents.org (or equivalent).
  // The structure below is a standard agentic inference request pattern.
  //
  const prompt =
    typeof context.prompt === "string"
      ? context.prompt
      : typeof context.taskDescription === "string"
      ? context.taskDescription
      : "";

  const systemPrompt =
    typeof context.systemPrompt === "string"
      ? context.systemPrompt
      : `You are ${agent.name}, a helpful AI agent running inside ClawHQ.`;

  const payload: Record<string, unknown> = {
    model,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    metadata: {
      agent_id: agent.id,
      agent_name: agent.name,
      run_id: runId,
      ...(agentHandle ? { agent_handle: agentHandle } : {}),
    },
  };

  // ── Emit init line ──────────────────────────────────────────────────────────
  const sessionId = `openagents-${runId}`;
  await onLog("stdout", emitLine({ type: "system", subtype: "init", model, session_id: sessionId }));

  // ── Call OpenAgents API ─────────────────────────────────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let fullText = "";

  try {
    const res = await fetch(`${networkUrl}/agents/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Paperclip-Run-Id": runId,
        "X-Agent-Handle": agentHandle ?? "",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let hint = "";
      if (res.status === 401) hint = " Check your OpenAgents API key.";
      else if (res.status === 403) hint = " Your plan may not support this model.";
      else if (res.status === 404) hint = " The OpenAgents API endpoint was not found — verify networkUrl.";
      else if (res.status === 429) hint = " Rate limited. Try again in a moment.";
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `OpenAgents API returned HTTP ${res.status}.${hint}\n${body}`.trim(),
      };
    }

    // ── Stream SSE response ────────────────────────────────────────────────
    //
    // OpenAgents is expected to return server-sent events with delta chunks.
    // Each data: line is a JSON object with either a content delta or a final
    // usage summary. Adjust the field names below to match actual API output.
    //
    // TODO: Confirm exact SSE event shape from OpenAgents API docs.
    //
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }

        // Delta text chunk
        const delta = (event.delta as Record<string, unknown>)?.text
          ?? (event.choices as Array<Record<string, unknown>>)?.[0]?.delta?.content
          ?? null;

        if (typeof delta === "string" && delta) {
          fullText += delta;
          await onLog("stdout", emitLine({
            type: "assistant",
            message: { role: "assistant", content: [{ type: "text", text: delta }] },
          }));
        }

        // Usage / final event
        if (event.usage) {
          const u = event.usage as Record<string, unknown>;
          inputTokens = typeof u.input_tokens === "number" ? u.input_tokens
            : typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0;
          outputTokens = typeof u.output_tokens === "number" ? u.output_tokens
            : typeof u.completion_tokens === "number" ? u.completion_tokens : 0;
        }
        if (typeof event.cost_usd === "number") costUsd = event.cost_usd;
      }
    }
  } catch (err) {
    clearTimeout(timer);
    const timedOut = (err as Error).name === "AbortError";
    return {
      exitCode: 1,
      signal: null,
      timedOut,
      errorMessage: timedOut
        ? `OpenAgents run timed out after ${timeoutMs / 1000}s`
        : (err instanceof Error ? err.message : String(err)),
    };
  } finally {
    clearTimeout(timer);
  }

  // ── Emit result line ────────────────────────────────────────────────────────
  await onLog("stdout", emitLine({
    type: "result",
    subtype: "success",
    result: fullText,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    total_cost_usd: costUsd,
  }));

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    provider: "openagents",
    model,
    billingType: "api",
    costUsd: costUsd || null,
    usage: inputTokens || outputTokens
      ? { inputTokens, outputTokens, cachedTokens: 0 }
      : undefined,
    summary: fullText.slice(0, 200) || "Run completed via OpenAgents network",
    sessionId,
  };
}
