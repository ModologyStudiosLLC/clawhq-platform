import { NextResponse } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || "http://localhost:4200";

// The reddit-intel agent writes its report to /data/reddit-intel/latest.json
// inside the OpenFang container. We fetch it via the OpenFang file API.
const REPORT_PATH = "/data/reddit-intel/latest.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Read the latest report via OpenFang's file read API.
    const res = await fetch(
      `${OPENFANG}/api/files/read?path=${encodeURIComponent(REPORT_PATH)}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    );

    if (res.status === 404) {
      return NextResponse.json(
        { error: "No report yet — trigger the reddit-intel agent to run a scan." },
        { status: 404 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenFang returned ${res.status}` },
        { status: 502 },
      );
    }

    const report = await res.json();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch report" },
      { status: 502 },
    );
  }
}

// POST — trigger a scan by sending a message to the reddit-intel agent.
export async function POST() {
  try {
    // Find the reddit-intel agent.
    const agentsRes = await fetch(`${OPENFANG}/api/agents`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!agentsRes.ok) {
      return NextResponse.json({ error: "Cannot reach OpenFang" }, { status: 502 });
    }

    const agents: Array<{ id: string; name: string; state: string }> = await agentsRes.json();
    const agent = agents.find((a) => a.name === "reddit-intel");

    if (!agent) {
      return NextResponse.json(
        { error: "reddit-intel agent not found — check OpenFang agent roster." },
        { status: 404 },
      );
    }

    // Create a session and send the scan trigger message.
    const sessionRes = await fetch(`${OPENFANG}/api/agents/${agent.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5000),
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 502 });
    }

    const { session_id, id: sessionId } = await sessionRes.json();
    const sid = session_id ?? sessionId;

    // Fire-and-forget — the scan takes 2-5 minutes, don't await it.
    fetch(`${OPENFANG}/api/agents/${agent.id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sid,
        message: "Run a full Reddit intelligence scan now. Follow your scan process: run the scanner script, analyze the results, save the report to /data/reddit-intel/latest.json, and post the summary to Discord.",
      }),
    }).catch(() => {
      // Ignore — fire and forget
    });

    return NextResponse.json({
      ok: true,
      message: "Scan triggered — results will appear in 2-5 minutes.",
      agentId: agent.id,
      sessionId: sid,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Trigger failed" },
      { status: 500 },
    );
  }
}
