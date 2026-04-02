import { NextResponse } from "next/server";
import { listContainers } from "@/lib/docker";

export const dynamic = "force-dynamic";

const DOCKER_PROXY = process.env.DOCKER_PROXY_URL || "";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceName = url.searchParams.get("service") || "";
  const tail = parseInt(url.searchParams.get("tail") || "150", 10);

  if (!DOCKER_PROXY) {
    return NextResponse.json({ error: "Docker proxy not configured" }, { status: 503 });
  }

  const containers = await listContainers();
  const container = containers.find(c => c.serviceName === serviceName || c.name === serviceName);
  if (!container) {
    return NextResponse.json({ error: "Container not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      try {
        const res = await fetch(
          `${DOCKER_PROXY}/v1.47/containers/${container.id}/logs?stdout=1&stderr=1&follow=1&tail=${tail}&timestamps=1`,
          { signal: request.signal, cache: "no-store" }
        );
        if (!res.ok || !res.body) {
          send({ type: "error", message: "Failed to connect to log stream" });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        let buffer = new Uint8Array(0);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Append to buffer
          const newBuf = new Uint8Array(buffer.length + value.length);
          newBuf.set(buffer);
          newBuf.set(value, buffer.length);
          buffer = newBuf;

          // Parse Docker multiplexed log frames
          while (buffer.length >= 8) {
            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const streamType = view.getUint8(0); // 1=stdout, 2=stderr
            const size = view.getUint32(4, false);
            if (buffer.length < 8 + size) break;
            const payload = new TextDecoder().decode(buffer.slice(8, 8 + size));
            send({ type: "log", stream: streamType === 2 ? "stderr" : "stdout", line: payload.trimEnd() });
            buffer = buffer.slice(8 + size);
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          send({ type: "error", message: String(e) });
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
