/**
 * SSE endpoint — pushes agent + session updates every 3 seconds.
 * Replaces polling in dashboard components.
 */

const OPENFANG =
  process.env.OPENFANG_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_OPENFANG_URL ||
  "http://localhost:4200";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  async function fetchAgents() {
    try {
      const res = await fetch(`${OPENFANG}/api/agents`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`${OPENFANG}/api/sessions`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.sessions ?? data ?? null;
    } catch {
      return null;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        } catch {
          // client disconnected
        }
      };

      // Send immediately on connect
      const [initialAgents, initialSessions] = await Promise.all([
        fetchAgents(),
        fetchSessions(),
      ]);
      if (initialAgents !== null) send("agents", initialAgents);
      if (initialSessions !== null) send("sessions", initialSessions);

      let tick = 0;
      const interval = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        // Agents every tick (3s), sessions every 4th tick (12s — they change less often)
        const [agents, sessions] = await Promise.all([
          fetchAgents(),
          tick % 4 === 0 ? fetchSessions() : Promise.resolve(null),
        ]);

        if (agents !== null) send("agents", agents);
        if (sessions !== null) send("sessions", sessions);
        tick++;
      }, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
