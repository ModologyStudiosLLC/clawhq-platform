import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory ring buffer — up to 60 snapshots per service (15s interval = 15 min of history)
const RING_SIZE = 60;

interface HealthPoint {
  ts: number;
  ok: boolean;
  latencyMs: number;
}

// Module-level store so it persists across requests within a server process
const history: Record<string, HealthPoint[]> = {};
let lastSnapshotTs = 0;

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
