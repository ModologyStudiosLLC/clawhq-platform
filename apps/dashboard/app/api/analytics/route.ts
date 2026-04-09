import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ANALYTICS_FILE =
  process.env.CLAWHQ_ANALYTICS_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/analytics.json"
    : path.join(process.cwd(), ".analytics.dev.json"));

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
const MAX_SNAPSHOTS = 720; // 30 days at hourly snapshots

export interface ToolStat {
  tool_name: string;
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_duration_ms: number;
  last_seen: string;
}

export interface AnalyticsSnapshot {
  ts: number;
  tokensByAgent: Record<string, number>;
  totalTokens: number;
  toolStats?: ToolStat[];
}

async function readSnapshots(): Promise<AnalyticsSnapshot[]> {
  try {
    const raw = await fs.readFile(ANALYTICS_FILE, "utf8");
    return JSON.parse(raw) as AnalyticsSnapshot[];
  } catch {
    return [];
  }
}

async function writeSnapshots(snaps: AnalyticsSnapshot[]): Promise<void> {
  await fs.mkdir(path.dirname(ANALYTICS_FILE), { recursive: true });
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(snaps, null, 2), "utf8");
}

function parseTokenMetrics(text: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const m = line.match(/^openfang_tokens_total\{([^}]+)\}\s+([\d.]+)/);
    if (!m) continue;
    const labels: Record<string, string> = {};
    for (const part of m[1].split(",")) {
      const [k, v] = part.split("=");
      labels[k] = v?.replace(/"/g, "") ?? "";
    }
    const agent = labels.agent || m[1];
    result[agent] = (result[agent] ?? 0) + parseFloat(m[2]);
  }
  return result;
}

async function fetchToolStats(): Promise<ToolStat[]> {
  try {
    const res = await fetch(`${OPENFANG}/api/tool-stats`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return (await res.json()) as ToolStat[];
  } catch {
    return [];
  }
}

// GET — return stored snapshots (optionally limited by ?days=N)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "30");
  const cutoff = Date.now() - days * 86400_000;
  const snaps = await readSnapshots();
  return NextResponse.json(snaps.filter(s => s.ts >= cutoff));
}

// POST — take a new snapshot (called by client polling or cron)
export async function POST() {
  try {
    const [metricsRes, toolStats] = await Promise.all([
      fetch(`${OPENFANG}/api/metrics`, { signal: AbortSignal.timeout(5000) }),
      fetchToolStats(),
    ]);
    if (!metricsRes.ok) throw new Error(`openfang metrics ${metricsRes.status}`);
    const text = await metricsRes.text();
    const tokensByAgent = parseTokenMetrics(text);
    const totalTokens = Object.values(tokensByAgent).reduce((s, v) => s + v, 0);

    const snap: AnalyticsSnapshot = {
      ts: Date.now(),
      tokensByAgent,
      totalTokens,
      toolStats: toolStats.length > 0 ? toolStats : undefined,
    };
    const snaps = await readSnapshots();
    snaps.push(snap);
    await writeSnapshots(snaps.slice(-MAX_SNAPSHOTS));
    return NextResponse.json(snap, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
