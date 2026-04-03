// ClawHQ Model Router — intelligently selects the best model for each task.
//
// Routing priority (highest → lowest):
//   1. Explicit per-session user override (caller passes modelRef — router skips)
//   2. Per-task-type locked override from config (taskTypeOverrides)
//   3. Self-learning adjustment (if enough samples + not locked)
//   4. Budget fallback (if budgetUsedPercent > threshold)
//   5. Ollama local routing (if available + task is cheap)
//   6. Task-type default table
//   7. Configured primaryModel or OpenClaw default

import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import type { ModelRouterConfig, TaskType } from "../config/types.model-router.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModelRef = { provider: string; model: string };

export type RouterContext = {
  /** The current user message — used for task-type detection. */
  message: string;
  /** Agent ID, used for per-agent locked overrides in the future. */
  agentId?: string;
  /**
   * Budget consumed as a percentage (0–100). Pass the live value from
   * ClawCost or token-usage.json. Omit to skip budget-aware routing.
   */
  budgetUsedPercent?: number;
  /** Task priority — critical tasks always use the primary model. */
  priority?: "critical" | "standard" | "background";
};

export type RouterResult = ModelRef & {
  /** Human-readable explanation of why this model was chosen. */
  reason: string;
  /** The detected task type that drove routing. */
  taskType: TaskType;
  /** Whether this result came from the self-learning adjustment. */
  fromSelfLearning: boolean;
};

// Per-task-type outcome record for self-learning.
export type TaskOutcome = {
  taskType: TaskType;
  provider: string;
  model: string;
  /** true = task completed without error; false = error / retry / abort. */
  success: boolean;
  /** Wall-clock duration in ms. */
  durationMs?: number;
  timestamp: number;
};

type ModelStats = {
  calls: number;
  successes: number;
  totalDurationMs: number;
};

type TaskTypeStats = Record<string, ModelStats>; // key = "provider/model"

type RouterStatsFile = {
  version: 1;
  updatedAt: string;
  stats: Partial<Record<TaskType, TaskTypeStats>>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATS_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? "~",
  ".openclaw",
  "model-router-stats.json",
);

/** Default routing table: task type → "provider/model". */
const DEFAULT_TASK_ROUTES: Record<TaskType, string> = {
  code: "anthropic/claude-sonnet-4-6",
  research: "anthropic/claude-sonnet-4-6",
  summary: "anthropic/claude-haiku-4-5",
  creative: "anthropic/claude-opus-4-6",
  chat: "anthropic/claude-haiku-4-5",
};

/** Cheap tasks that can be routed to Ollama when available. */
const OLLAMA_ELIGIBLE_TASKS: TaskType[] = ["summary", "chat"];

/** Budget-friendly tasks that downgrade on threshold breach. */
const BUDGET_DOWNGRADE_TASKS: TaskType[] = ["summary", "chat", "research"];

// ── Task-type detection ───────────────────────────────────────────────────────

const CODE_TOKENS = [
  "code", "function", "class", "debug", "fix", "refactor", "implement",
  "typescript", "javascript", "python", "rust", "go", "review", "pr",
  "test", "lint", "build", "deploy", "script", "error", "bug", "compile",
];
const RESEARCH_TOKENS = [
  "research", "find", "search", "analyze", "analyse", "compare", "what is",
  "how does", "explain", "summarize", "article", "paper", "topic", "learn",
  "trend", "market", "competitor", "report", "intelligence",
];
const SUMMARY_TOKENS = [
  "summarize", "summary", "tldr", "tl;dr", "brief", "shorten", "condense",
  "key points", "highlights", "overview", "digest",
];
const CREATIVE_TOKENS = [
  "write", "draft", "story", "blog", "post", "email", "copy", "creative",
  "content", "newsletter", "script", "headline", "tagline", "campaign",
  "brand", "voice", "tone",
];

/** Keyword-based task-type classifier. Returns the most likely task type. */
export function detectTaskType(message: string): TaskType {
  const lower = message.toLowerCase();

  const scores: Record<TaskType, number> = {
    code: 0,
    research: 0,
    summary: 0,
    creative: 0,
    chat: 0,
  };

  for (const token of CODE_TOKENS) {
    if (lower.includes(token)) scores.code += 1;
  }
  for (const token of RESEARCH_TOKENS) {
    if (lower.includes(token)) scores.research += 1;
  }
  for (const token of SUMMARY_TOKENS) {
    if (lower.includes(token)) scores.summary += 1;
  }
  for (const token of CREATIVE_TOKENS) {
    if (lower.includes(token)) scores.creative += 1;
  }

  // Find the task type with the highest score; fall back to "chat"
  let best: TaskType = "chat";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [TaskType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}

// ── Model string parsing ──────────────────────────────────────────────────────

/** Parse "provider/model" into a ModelRef. Returns null if format is invalid. */
export function parseModelString(s: string): ModelRef | null {
  const idx = s.indexOf("/");
  if (idx < 1 || idx === s.length - 1) return null;
  return { provider: s.slice(0, idx), model: s.slice(idx + 1) };
}

/** Format a ModelRef back to "provider/model". */
export function modelRefToString(ref: ModelRef): string {
  return `${ref.provider}/${ref.model}`;
}

// ── Self-learning stats ───────────────────────────────────────────────────────

function loadStats(): RouterStatsFile {
  try {
    const raw = fs.readFileSync(STATS_PATH, "utf8");
    return JSON.parse(raw) as RouterStatsFile;
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), stats: {} };
  }
}

function saveStats(data: RouterStatsFile): void {
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(STATS_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Non-fatal — stats are best-effort
  }
}

/**
 * Record the outcome of a completed task for self-learning.
 * Call this after each agent turn completes (success or failure).
 */
export function recordOutcome(outcome: TaskOutcome): void {
  const data = loadStats();
  data.stats[outcome.taskType] ??= {};
  const key = `${outcome.provider}/${outcome.model}`;
  const existing = data.stats[outcome.taskType]![key] ?? {
    calls: 0,
    successes: 0,
    totalDurationMs: 0,
  };
  existing.calls += 1;
  if (outcome.success) existing.successes += 1;
  if (outcome.durationMs) existing.totalDurationMs += outcome.durationMs;
  data.stats[outcome.taskType]![key] = existing;
  saveStats(data);
}

/**
 * Given stats for a task type, return the model string with the best
 * success rate (requires at least `minSamples` calls). Returns null if no
 * model meets the threshold.
 */
function bestModelFromStats(
  taskStats: TaskTypeStats,
  minSamples: number,
): string | null {
  let best: string | null = null;
  let bestRate = -1;

  for (const [modelKey, stats] of Object.entries(taskStats)) {
    if (stats.calls < minSamples) continue;
    const rate = stats.successes / stats.calls;
    if (rate > bestRate) {
      bestRate = rate;
      best = modelKey;
    }
  }
  return best;
}

// ── Ollama availability (cached, non-blocking) ────────────────────────────────

let ollamaAvailableCache: boolean | null = null;
let ollamaLastCheckAt = 0;
const OLLAMA_CACHE_TTL_MS = 60_000; // re-probe every 60s

/** Check if Ollama is running. Result is cached for 60 seconds. */
export async function checkOllamaAvailable(baseUrl = "http://localhost:11434"): Promise<boolean> {
  const now = Date.now();
  if (ollamaAvailableCache !== null && now - ollamaLastCheckAt < OLLAMA_CACHE_TTL_MS) {
    return ollamaAvailableCache;
  }
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "HEAD",
      signal: AbortSignal.timeout(1500),
    });
    ollamaAvailableCache = res.ok || res.status === 405; // 405 = endpoint exists
    ollamaLastCheckAt = now;
  } catch {
    ollamaAvailableCache = false;
    ollamaLastCheckAt = now;
  }
  return ollamaAvailableCache;
}

// ── ClawCost budget check ─────────────────────────────────────────────────────

const TOKEN_USAGE_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? "~",
  ".openclaw",
  "token-usage.json",
);

/**
 * Read current budget usage from token-usage.json.
 * Returns a percentage (0–100) of monthly budget consumed.
 * Returns null if usage data or budget cap is unavailable.
 */
export function readBudgetUsedPercent(cfg: OpenClawConfig): number | null {
  const cap = cfg.agents?.defaults?.budget?.monthlyCap;
  if (!cap || cap <= 0) return null;

  try {
    const raw = fs.readFileSync(TOKEN_USAGE_PATH, "utf8");
    const usage = JSON.parse(raw) as { totalCost?: number };
    if (typeof usage.totalCost !== "number") return null;
    return Math.min(100, (usage.totalCost / cap) * 100);
  } catch {
    return null;
  }
}

// ── Core selectModel ──────────────────────────────────────────────────────────

/**
 * Select the best model for the given context.
 *
 * This is the synchronous fast path — it does not probe Ollama in real time.
 * Use `selectModelAsync()` when you can afford an await (e.g. task start).
 */
export function selectModel(
  cfg: OpenClawConfig,
  ctx: RouterContext,
): RouterResult {
  const routerCfg: ModelRouterConfig = cfg.modelRouter ?? {};

  // Router disabled — return primary model or empty (caller falls back)
  if (routerCfg.enabled === false) {
    const primary = routerCfg.primaryModel
      ? parseModelString(routerCfg.primaryModel)
      : null;
    return {
      ...(primary ?? { provider: "anthropic", model: "claude-sonnet-4-6" }),
      reason: "router disabled — using primary model",
      taskType: "chat",
      fromSelfLearning: false,
    };
  }

  const taskType = detectTaskType(ctx.message);
  const threshold = routerCfg.budgetThreshold ?? 80;
  const minSamples = routerCfg.selfLearningSampleThreshold ?? 20;
  const lockedTypes = new Set(routerCfg.lockedTaskTypes ?? []);

  // 1. Per-task-type config override (highest priority after user override)
  const taskOverride = routerCfg.taskTypeOverrides?.[taskType];
  if (taskOverride) {
    const ref = parseModelString(taskOverride);
    if (ref) {
      return { ...ref, reason: `task-type override for "${taskType}"`, taskType, fromSelfLearning: false };
    }
  }

  // 2. Self-learning adjustment (if enabled + not locked + enough data)
  if (routerCfg.selfLearning !== false && !lockedTypes.has(taskType)) {
    const data = loadStats();
    const taskStats = data.stats[taskType];
    if (taskStats) {
      const learnedModel = bestModelFromStats(taskStats, minSamples);
      if (learnedModel) {
        const ref = parseModelString(learnedModel);
        if (ref) {
          return {
            ...ref,
            reason: `self-learning: best model for "${taskType}" (from stats)`,
            taskType,
            fromSelfLearning: true,
          };
        }
      }
    }
  }

  // 3. Budget fallback — non-critical tasks downgrade when budget is tight
  if (ctx.priority !== "critical" && BUDGET_DOWNGRADE_TASKS.includes(taskType)) {
    const budgetPct =
      ctx.budgetUsedPercent !== undefined
        ? ctx.budgetUsedPercent
        : readBudgetUsedPercent(cfg);
    if (budgetPct !== null && budgetPct >= threshold) {
      const fallback = routerCfg.fallbackModel
        ? parseModelString(routerCfg.fallbackModel)
        : { provider: "anthropic", model: "claude-haiku-4-5" };
      if (fallback) {
        return {
          ...fallback,
          reason: `budget fallback (${Math.round(budgetPct)}% used ≥ ${threshold}% threshold)`,
          taskType,
          fromSelfLearning: false,
        };
      }
    }
  }

  // 4. Ollama routing for cheap tasks (uses cached availability)
  if (
    routerCfg.ollamaEnabled !== false &&
    OLLAMA_ELIGIBLE_TASKS.includes(taskType) &&
    ctx.priority === "background" &&
    ollamaAvailableCache === true
  ) {
    const ollamaModel = routerCfg.ollamaModel ?? "llama3.2";
    return {
      provider: "ollama",
      model: ollamaModel,
      reason: `ollama local routing for "${taskType}" background task`,
      taskType,
      fromSelfLearning: false,
    };
  }

  // 5. Task-type default table, optionally overridden by primaryModel
  const tableDefault = DEFAULT_TASK_ROUTES[taskType];
  const defaultRef = parseModelString(tableDefault) ?? {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  };

  // If user set a primaryModel, use it for non-summary/non-chat types
  // (summary/chat stay cheap by default unless overridden)
  const primary = routerCfg.primaryModel ? parseModelString(routerCfg.primaryModel) : null;
  if (primary && !["summary", "chat"].includes(taskType)) {
    return {
      ...primary,
      reason: `primary model for "${taskType}"`,
      taskType,
      fromSelfLearning: false,
    };
  }

  return {
    ...defaultRef,
    reason: `default route for "${taskType}"`,
    taskType,
    fromSelfLearning: false,
  };
}

/**
 * Async variant of selectModel — probes Ollama availability before routing.
 * Use at task-start boundaries where a short await is acceptable.
 */
export async function selectModelAsync(
  cfg: OpenClawConfig,
  ctx: RouterContext,
): Promise<RouterResult> {
  const routerCfg: ModelRouterConfig = cfg.modelRouter ?? {};
  // Warm the Ollama cache if enabled before the sync path runs
  if (routerCfg.ollamaEnabled !== false) {
    await checkOllamaAvailable(routerCfg.ollamaBaseUrl);
  }
  return selectModel(cfg, ctx);
}

/**
 * Return a human-readable summary of the current routing configuration.
 * Used by the dashboard settings API to show the active state.
 */
export function describeRouterState(cfg: OpenClawConfig): {
  enabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  budgetThreshold: number;
  ollamaEnabled: boolean;
  selfLearning: boolean;
  taskTypeOverrides: Partial<Record<TaskType, string>>;
  lockedTaskTypes: TaskType[];
  statsPath: string;
} {
  const r = cfg.modelRouter ?? {};
  return {
    enabled: r.enabled !== false,
    primaryModel: r.primaryModel ?? DEFAULT_TASK_ROUTES.code,
    fallbackModel: r.fallbackModel ?? "anthropic/claude-haiku-4-5",
    budgetThreshold: r.budgetThreshold ?? 80,
    ollamaEnabled: r.ollamaEnabled !== false,
    selfLearning: r.selfLearning !== false,
    taskTypeOverrides: r.taskTypeOverrides ?? {},
    lockedTaskTypes: r.lockedTaskTypes ?? [],
    statsPath: STATS_PATH,
  };
}
