import { NextResponse } from "next/server";

/**
 * GET /api/openclaw/ws-proxy
 * Returns the WebSocket URL the client should connect to.
 * The gateway token is a server-side secret — never returned to the browser.
 * The client authenticates via its WorkOS session cookie; the server-side
 * streaming routes attach the gateway token when proxying upstream.
 */
export async function GET() {
  const base = process.env.OPENCLAW_INTERNAL_URL ?? process.env.NEXT_PUBLIC_OPENCLAW_URL ?? "";
  const wsUrl = base
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace(/\/$/, "") + "/ws";

  return NextResponse.json({ wsUrl });
}
