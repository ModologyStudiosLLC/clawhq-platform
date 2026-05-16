import { NextRequest, NextResponse } from "next/server";
import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TRAJ_DIR = join(homedir(), ".clawhq", "trajectories");

function ensureDir() {
  if (!existsSync(TRAJ_DIR)) mkdirSync(TRAJ_DIR, { recursive: true });
}

function todayFile() {
  const d = new Date().toISOString().slice(0, 10);
  return join(TRAJ_DIR, `${d}.jsonl`);
}

function readDays(n = 7): object[] {
  ensureDir();
  const entries: object[] = [];
  try {
    const files = readdirSync(TRAJ_DIR)
      .filter(f => f.endsWith(".jsonl"))
      .sort()
      .reverse()
      .slice(0, n);
    for (const file of files) {
      const lines = readFileSync(join(TRAJ_DIR, file), "utf-8")
        .split("\n")
        .filter(Boolean);
      for (const line of lines) {
        try { entries.push(JSON.parse(line)); } catch { /* skip */ }
      }
    }
  } catch { /* dir empty */ }
  return entries;
}

// GET /api/trajectories — returns last 7 days of trajectory data + summary stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(30, parseInt(searchParams.get("days") ?? "7", 10));

  const entries = readDays(days) as Array<{
    ts: string; agent: string; model: string; tier: string;
    outcome: string; latency_ms: number; tokens_in: number; tokens_out: number;
    draft_accepted?: boolean; tool_calls: string[];
  }>;

  // Summary stats
  const total = entries.length;
  const byTier: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  let draftTotal = 0, draftAccepted = 0;
  let totalLatency = 0, totalTokens = 0;

  for (const e of entries) {
    byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
    byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1;
    byAgent[e.agent] = (byAgent[e.agent] ?? 0) + 1;
    if (e.draft_accepted !== undefined && e.draft_accepted !== null) {
      draftTotal++;
      if (e.draft_accepted) draftAccepted++;
    }
    totalLatency += e.latency_ms ?? 0;
    totalTokens += (e.tokens_in ?? 0) + (e.tokens_out ?? 0);
  }

  const cheapRuns = (byTier.simple ?? 0) + (byTier.standard ?? 0);
  const expensiveRuns = (byTier.complex ?? 0) + (byTier.expert ?? 0);

  return NextResponse.json({
    entries: entries.slice(0, 200), // cap to 200 for response size
    stats: {
      total,
      byTier,
      byOutcome,
      byAgent,
      successRate: total > 0 ? Math.round(((byOutcome.success ?? 0) / total) * 100) : 0,
      cheapRate: total > 0 ? Math.round((cheapRuns / total) * 100) : 0,
      draftAcceptRate: draftTotal > 0 ? Math.round((draftAccepted / draftTotal) * 100) : null,
      avgLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
      totalTokens,
      cheapRuns,
      expensiveRuns,
    },
  });
}

// POST /api/trajectories — append a single trajectory entry
export async function POST(req: NextRequest) {
  ensureDir();
  try {
    const body = await req.json();
    const entry = {
      id: Math.random().toString(36).slice(2, 10),
      ts: new Date().toISOString(),
      ...body,
    };
    appendFileSync(todayFile(), JSON.stringify(entry) + "\n");
    return NextResponse.json({ logged: true, id: entry.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
