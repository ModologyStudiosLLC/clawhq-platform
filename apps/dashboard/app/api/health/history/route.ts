import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Ring buffer — up to 60 snapshots per service (15s interval = ~15 min of history)
const RING_SIZE = 60;

const HISTORY_FILE =
  process.env.CLAWHQ_HEALTH_HISTORY_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/health-history.json"
    : path.join(process.cwd(), ".health-history.dev.json"));

interface HealthPoint {
  ts: number;
  ok: boolean;
  latencyMs: number;
}

let history: Record<string, HealthPoint[]> = {};
let lastSnapshotTs = 0;
let _loaded = false;

async function loadHistory(): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    history = JSON.parse(raw) as Record<string, HealthPoint[]>;
  } catch {
    // File doesn't exist yet — start fresh
  }
}

async function saveHistory(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history), "utf8");
  } catch { /* best-effort */ }
}

const SERVICES: Record<string, { url: string; path: string }> = {
  OpenClaw: {
    url: process.env.OPENCLAW_INTERNAL_URL || "http://localhost:18789",
    path: "/healthz",
  },
  Paperclip: {
    url: process.env.PAPERCLIP_INTERNAL_URL || "http://localhost:3100",
    path: "/api/companies",
  },
  OpenFang: {
    url: process.env.OPENFANG_INTERNAL_URL || "http://localhost:4200",
    path: "/api/health",
  },
  Hermes: {
    url: process.env.HERMES_INTERNAL_URL || "http://localhost:4300",
    path: "/health",
  },
};

async function probeOne(name: string, url: string, path: string): Promise<HealthPoint> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}${path}`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3000),
    });
    return { ts: t0, ok: res.ok, latencyMs: Date.now() - t0 };
  } catch {
    return { ts: t0, ok: false, latencyMs: Date.now() - t0 };
  }
}

async function snapshot() {
  await loadHistory();
  const now = Date.now();
  // Debounce — only probe if >10s since last snapshot
  if (now - lastSnapshotTs < 10_000) return;
  lastSnapshotTs = now;

  const results = await Promise.all(
    Object.entries(SERVICES).map(async ([name, { url, path }]) => ({
      name,
      point: await probeOne(name, url, path),
    }))
  );

  for (const { name, point } of results) {
    if (!history[name]) history[name] = [];
    history[name].push(point);
    if (history[name].length > RING_SIZE) history[name].shift();
  }

  await saveHistory();
}

export async function GET() {
  await snapshot();
  return NextResponse.json({ history, services: Object.keys(SERVICES) });
}

// POST triggers a forced probe (bypasses debounce)
export async function POST() {
  lastSnapshotTs = 0;
  await snapshot();
  return NextResponse.json({ history, services: Object.keys(SERVICES) });
}
