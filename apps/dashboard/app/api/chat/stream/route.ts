import { NextRequest } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
const AGENT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function errorEvent(msg: string): Response {
  const body = `data: ${JSON.stringify({ error: msg, done: true })}\n\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const { agentId, sessionId, message } = await req.json();

  if (!agentId || !AGENT_ID_RE.test(agentId)) {
    return errorEvent("Invalid agentId");
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${OPENFANG}/api/agents/${agentId}/message/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId }),
      }
    );
  } catch {
    return errorEvent("Agent service unreachable");
  }

  if (!upstream.ok || !upstream.body) {
    return errorEvent(`Agent service returned ${upstream.status}`);
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
