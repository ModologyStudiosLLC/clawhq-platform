/**
 * Orchestration API — proxy to the orchestration server on :4400.
 *
 * Forwards all CRUD operations for tasks and health to the Python
 * orchestration service. The dashboard uses this for the task queue page.
 *
 * Routes (all proxied to :4400):
 *   GET    /api/orchestration           → GET  /tasks
 *   POST   /api/orchestration           → POST /tasks
 *   GET    /api/orchestration/health    → GET  /health/full
 *   GET    /api/orchestration/stats     → GET  /stats
 *   PATCH  /api/orchestration/:id       → PATCH /tasks/:id
 *   DELETE /api/orchestration/:id       → DELETE /tasks/:id
 */

import { NextRequest, NextResponse } from "next/server";

const ORCH = process.env.ORCHESTRATION_URL ?? "http://localhost:4400";

async function proxy(req: NextRequest, upstreamPath: string, method?: string): Promise<NextResponse> {
  const url = new URL(upstreamPath, ORCH);

  // Forward query params
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const body = ["POST", "PATCH"].includes(method ?? req.method)
      ? await req.text()
      : undefined;

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

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/orchestration", "");
  if (path === "/health") return proxy(req, "/health/full");
  if (path === "/stats")  return proxy(req, "/stats");
  if (path.startsWith("/") && path.length > 1) {
    const taskId = path.slice(1);
    return proxy(req, `/tasks/${taskId}`);
  }
  return proxy(req, "/tasks");
}

export async function POST(req: NextRequest) {
  return proxy(req, "/tasks", "POST");
}

export async function PATCH(req: NextRequest) {
  const taskId = req.nextUrl.pathname.replace("/api/orchestration/", "");
  return proxy(req, `/tasks/${taskId}`, "PATCH");
}

export async function DELETE(req: NextRequest) {
  const taskId = req.nextUrl.pathname.replace("/api/orchestration/", "");
  return proxy(req, `/tasks/${taskId}`, "DELETE");
}
