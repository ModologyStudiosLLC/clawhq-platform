/**
 * Paperclip → OpenFang bridge endpoint.
 *
 * Paperclip workflows call this endpoint via the HTTP adapter when they need
 * an OpenFang agent to execute a task. This bridge resolves the right agent
 * by name or profile, creates a session, sends the task, and returns the result.
 *
 * Paperclip HTTP adapter config:
 *   url: http://dashboard:3500/api/bridge/agent-task
 *   method: POST
 *   headers:
 *     X-Bridge-Signature: sha256=<hmac-sha256 of body using CLAWHQ_BRIDGE_SECRET>
 *   payloadTemplate:
 *     task: "Your task description here"
 *     agentProfile: "research"   # or agentName: "Scout"
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || "http://localhost:4200";
const BRIDGE_SECRET = process.env.CLAWHQ_BRIDGE_SECRET ?? "";

// ── HMAC verification ─────────────────────────────────────────────────────────
// Paperclip signs the raw request body with CLAWHQ_BRIDGE_SECRET.
// If the secret is not set the check is skipped (open/dev mode).

function verifySignature(body: string, header: string | null): boolean {
  if (!BRIDGE_SECRET) return true; // secret not configured — open mode
  if (!header) return false;

  const expected = `sha256=${createHmac("sha256", BRIDGE_SECRET).update(body).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false; // length mismatch — definitely wrong
  }
}

// ── Agent resolution ──────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  state: string;
  profile: string | null;
  model_provider: string;
}

async function findAgent(agentName?: string, agentProfile?: string): Promise<Agent | null> {
  const res = await fetch(`${OPENFANG}/api/agents`, { cache: "no-store" });
  if (!res.ok) return null;
  const agents: Agent[] = await res.json().catch(() => []);

  // By exact name or ID
  if (agentName) {
    const lower = agentName.toLowerCase();
    const byName = agents.find(
      a => a.name.toLowerCase() === lower || a.id === agentName
    );
    if (byName) return byName;
    const fuzzy = agents.find(a => a.name.toLowerCase().includes(lower));
    if (fuzzy) return fuzzy;
  }

  // By profile — prefer Running
  if (agentProfile) {
    const profileLower = agentProfile.toLowerCase();
    const running = agents
      .filter(a => a.state === "Running")
      .find(a => (a.profile ?? "").toLowerCase() === profileLower);
    if (running) return running;
  }

  return agents.find(a => a.state === "Running") ?? null;
}

async function runTask(agentId: string, task: string): Promise<string> {
  const sessionRes = await fetch(`${OPENFANG}/api/agents/${agentId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!sessionRes.ok) throw new Error(`Failed to create session: HTTP ${sessionRes.status}`);
  const { session_id, id: sessionId } = await sessionRes.json();
  const sid = session_id ?? sessionId;

  const msgRes = await fetch(`${OPENFANG}/api/agents/${agentId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, message: task }),
  });
  if (!msgRes.ok) throw new Error(`Agent message failed: HTTP ${msgRes.status}`);
  const data = await msgRes.json();
  return data.content ?? data.message ?? data.response ?? JSON.stringify(data);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("x-bridge-signature"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const task = typeof body.task === "string" ? body.task : undefined;
  const agentName = typeof body.agentName === "string" ? body.agentName : undefined;
  const agentProfile = typeof body.agentProfile === "string" ? body.agentProfile : undefined;

  if (!task) {
    return NextResponse.json({ error: "Missing required field: task" }, { status: 400 });
  }

  try {
    const agent = await findAgent(agentName, agentProfile);
    if (!agent) {
      return NextResponse.json({ error: "No running agent found" }, { status: 503 });
    }

    const result = await runTask(agent.id, task);

    return NextResponse.json({
      ok: true,
      agent: { id: agent.id, name: agent.name, profile: agent.profile },
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
