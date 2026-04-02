import { NextResponse } from "next/server";

/**
 * GET /api/openclaw/ws-proxy
 * Returns the WebSocket URL the client should connect to.
 * This lets server-side env vars be safely exposed only for this one value.
 */
export async function GET() {
  const base = process.env.OPENCLAW_INTERNAL_URL ?? process.env.NEXT_PUBLIC_OPENCLAW_URL ?? "";
  const wsUrl = base
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace(/\/$/, "") + "/ws";

  return NextResponse.json({ wsUrl });
}
