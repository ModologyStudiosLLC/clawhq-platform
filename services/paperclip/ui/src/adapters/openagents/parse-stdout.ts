import type { TranscriptEntry } from "../types";

/**
 * Parse stdout lines emitted by the OpenAgents adapter.
 *
 * The adapter emits newline-delimited JSON matching Paperclip's transcript format:
 *   { type: "system",    subtype: "init", model, session_id }
 *   { type: "assistant", message: { content: [{ type: "text", text }] } }
 *   { type: "result",    subtype: "success"|"error", result, usage, total_cost_usd }
 *
 * Any unrecognised line falls through as a plain stdout entry.
 */
export function parseOpenAgentsStdoutLine(
  line: string,
  ts: string,
): TranscriptEntry[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [{ kind: "stdout", ts, text: line }];
  }

  const eventType = parsed.type as string | undefined;

  // ── init ────────────────────────────────────────────────────────────────────
  if (eventType === "system" && parsed.subtype === "init") {
    return [
      {
        kind: "init",
        ts,
        model: typeof parsed.model === "string" ? parsed.model : "openagents",
        sessionId: typeof parsed.session_id === "string" ? parsed.session_id : ts,
      },
    ];
  }

  // ── assistant text ──────────────────────────────────────────────────────────
  if (eventType === "assistant") {
    const message = parsed.message as Record<string, unknown> | undefined;
    const content = message?.content as Array<Record<string, unknown>> | undefined;
    const textBlock = content?.find((c) => c.type === "text");
    const text = typeof textBlock?.text === "string" ? textBlock.text : "";
    if (!text) return [];
    return [{ kind: "assistant", ts, text, delta: true }];
  }

  // ── result ──────────────────────────────────────────────────────────────────
  if (eventType === "result") {
    const usage = parsed.usage as Record<string, unknown> | undefined;
    const inputTokens =
      typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
    const outputTokens =
      typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;
    const costUsd =
      typeof parsed.total_cost_usd === "number" ? parsed.total_cost_usd : 0;
    const isError = parsed.subtype === "error";
    const resultText =
      typeof parsed.result === "string"
        ? parsed.result
        : isError
        ? "Run failed"
        : "Run completed";

    return [
      {
        kind: "result",
        ts,
        text: resultText,
        inputTokens,
        outputTokens,
        cachedTokens: 0,
        costUsd,
        subtype: isError ? "error" : "success",
        isError,
        errors: [],
      },
    ];
  }

  // ── fallthrough ─────────────────────────────────────────────────────────────
  return [{ kind: "stdout", ts, text: line }];
}
