/**
 * Catch-all for /api/orchestration/health, /api/orchestration/stats,
 * /api/orchestration/:id (GET/PATCH/DELETE)
 *
 * The base /api/orchestration route handles task list + create.
 * This handles everything under it.
 */

import { NextRequest, NextResponse } from "next/server";

const ORCH = process.env.ORCHESTRATION_URL ?? "http://localhost:4400";

async function proxy(req: NextRequest, upstreamPath: string, method?: string): Promise<NextResponse> {
  const url = new URL(upstreamPath, ORCH);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const body = ["POST", "PATCH"].includes(method ?? req.method) ? await req.text() : undefined;
    const res = await fetch(url.toString(), {
      method: method ?? req.method,
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Orchestration service unreachable" }, { status: 503 });
  }
}

const SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

function upstreamPath(segments: string[]): string {
  // Validate each segment to prevent path traversal (e.g. ".." or URL-encoded variants)
  if (!segments.every(s => SEGMENT_RE.test(s))) return "";
  const joined = segments.join("/");
  if (joined === "health") return "/health/full";
  if (joined === "stats")  return "/stats";
  return `/tasks/${joined}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const up = upstreamPath(path);
  if (!up) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  return proxy(req, up);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path.every(s => SEGMENT_RE.test(s))) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  return proxy(req, `/tasks/${path.join("/")}`, "PATCH");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path.every(s => SEGMENT_RE.test(s))) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  return proxy(req, `/tasks/${path.join("/")}`, "DELETE");
}
