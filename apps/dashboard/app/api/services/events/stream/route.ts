export const dynamic = "force-dynamic";

const DOCKER_PROXY = process.env.DOCKER_PROXY_URL || "";
const CLAWHIP = process.env.CLAWHIP_INTERNAL_URL || "http://localhost:25294";

// Crash dedup: service → last crash time
const crashAlerted = new Map<string, number>();

async function sendCrashAlert(service: string, exitCode: number) {
  const now = Date.now();
  const last = crashAlerted.get(service) || 0;
  if (now - last < 5 * 60 * 1000) return; // dedup 5 min
  crashAlerted.set(service, now);
  try {
    await fetch(`${CLAWHIP}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `⚠️ **${service}** crashed (exit code ${exitCode}). Check logs in the ClawHQ dashboard.`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-fatal */ }
}

export async function GET(request: Request) {
  if (!DOCKER_PROXY) {
    return new Response("data: {\"type\":\"unavailable\"}\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
        catch { /* client disconnected */ }
      };

      try {
        const filter = encodeURIComponent(JSON.stringify({
          type: ["container"],
          label: ["com.docker.compose.project=clawhq"],
        }));
        const res = await fetch(
          `${DOCKER_PROXY}/v1.47/events?filters=${filter}`,
          { signal: request.signal, cache: "no-store" }
        );
        if (!res.ok || !res.body) { controller.close(); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line);
              const action = evt.Action as string;
              const service = evt.Actor?.Attributes?.["com.docker.compose.service"] || evt.Actor?.Attributes?.name || "";
              if (action === "start") send({ type: "container.start", service });
              else if (action === "die") {
                const exitCode = parseInt(evt.Actor?.Attributes?.exitCode || "0", 10);
                send({ type: "container.die", service, exitCode });
                if (exitCode !== 0) await sendCrashAlert(service, exitCode);
              } else if (action === "restart") send({ type: "container.restart", service });
            } catch { /* malformed JSON line */ }
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          try { controller.close(); } catch { /* already closed */ }
        }
      }

      try { controller.close(); } catch { /* already closed */ }
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
