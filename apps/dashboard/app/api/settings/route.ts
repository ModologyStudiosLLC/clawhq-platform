import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logAudit } from "../audit/route.js";
import { notifyBudgetAlert } from "../../../lib/notify.js";

// Settings are persisted to a JSON file inside the dashboard's data volume.
// In Docker: /data/settings.json (mounted via paperclip-data or dashboard volume)
// In dev: /tmp/clawhq-settings.json
const SETTINGS_FILE =
  process.env.CLAWHQ_SETTINGS_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/settings.json"
    : path.join(process.cwd(), ".settings.dev.json"));

export const defaultSettings = {
  // General
  securityLevel: 1 as 0 | 1 | 2 | 3, // 0=Locked, 1=Balanced, 2=Open, 3=DevMode
  timezone: "UTC",
  displayName: "",
  // Agents
  agents: {
    hermes: {
      model: "claude-sonnet-4-6",
      tools: { web_search: true, code_exec: true, memory: true, calendar: false },
      schedule: "",
    },
    openfang: {
      model: "claude-sonnet-4-6",
      tools: { bash: true, file_write: true, browser: false, code_exec: true },
      schedule: "",
    },
  } as Record<string, { model: string; tools: Record<string, boolean>; schedule: string }>,
  // Budget
  monthlyBudgetCents: 2000, // $20
  budgetUnlimited: false,
  budgetAlertPercent: 80,
  providerCaps: {
    anthropic: 0,
    openai: 0,
    groq: 0,
    openrouter: 0,
  } as Record<string, number>,
  // Notifications
  notifications: {
    slackWebhookUrl: "",
    emailTo: "",
    budgetAlertEnabled: true,
    healthAlertEnabled: true,
    healthFailureThreshold: 3,
  },
  // Model Router
  modelRouter: {
    enabled: true,
    primaryModel: "anthropic/claude-sonnet-4-6",
    fallbackModel: "anthropic/claude-haiku-4-5",
    budgetThreshold: 80,
    ollamaEnabled: true,
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "llama3.2",
    selfLearning: true,
    selfLearningSampleThreshold: 20,
    lockedTaskTypes: [] as string[],
    taskTypeOverrides: {} as Record<string, string>,
  },
};

type Settings = typeof defaultSettings;

async function readSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

async function writeSettings(data: Settings): Promise<void> {
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const current = await readSettings();
  const merged: Settings = {
    ...current,
    ...body,
    agents: { ...current.agents, ...(body.agents ?? {}) },
    providerCaps: { ...current.providerCaps, ...(body.providerCaps ?? {}) },
    notifications: { ...current.notifications, ...(body.notifications ?? {}) },
    modelRouter: {
      ...current.modelRouter,
      ...(body.modelRouter ?? {}),
      taskTypeOverrides: {
        ...current.modelRouter.taskTypeOverrides,
        ...(body.modelRouter?.taskTypeOverrides ?? {}),
      },
    },
  };
  await writeSettings(merged);

  // Audit log — capture top-level keys that changed
  const changedKeys = Object.keys(body).filter(
    k => JSON.stringify((current as Record<string, unknown>)[k]) !== JSON.stringify((merged as Record<string, unknown>)[k]),
  );
  if (changedKeys.length > 0) {
    await logAudit("settings.updated", `Updated: ${changedKeys.join(", ")}`);
  }

  // Budget alert check
  if (!merged.budgetUnlimited && merged.monthlyBudgetCents > 0 && merged.notifications?.budgetAlertEnabled) {
    // Lightweight: re-read metrics for a quick cost estimate
    try {
      const metricsRes = await fetch(
        `${process.env.OPENFANG_INTERNAL_URL || "http://localhost:4200"}/api/metrics`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (metricsRes.ok) {
        const text = await metricsRes.text();
        let totalTokens = 0;
        for (const line of text.split("\n")) {
          const m = line.match(/^openfang_tokens_total\{[^}]+\}\s+([\d.]+)/);
          if (m) totalTokens += parseFloat(m[1]);
        }
        const spentCents = Math.round((totalTokens / 1_000_000) * 300); // ~$3/1M blended
        const pct = (spentCents / merged.monthlyBudgetCents) * 100;
        if (pct >= merged.budgetAlertPercent) {
          await notifyBudgetAlert(
            merged.notifications,
            pct,
            merged.budgetAlertPercent,
            spentCents,
            merged.monthlyBudgetCents,
          );
        }
      }
    } catch { /* best-effort */ }
  }

  return NextResponse.json(merged);
}
