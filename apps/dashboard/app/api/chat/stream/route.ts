import { NextRequest } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

export async function POST(req: NextRequest) {
  const { agentId, sessionId, message } = await req.json();

  const upstream = await fetch(
    `${OPENFANG}/api/agents/${agentId}/message/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("Stream failed", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
