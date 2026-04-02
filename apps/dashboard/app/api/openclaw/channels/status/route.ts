/**
 * Channel connection status for the Channels panel.
 *
 * OpenClaw's HTTP gateway only exposes /healthz — there is no REST endpoint
 * for channel status. Channel connections are owned by Hermes, which exposes
 * a /status endpoint that includes an array of active channel names.
 *
 * This route proxies Hermes /status and translates it into the ChannelsState
 * shape the panel expects: { discord?: { connected, username? }, ... }
 */

import { NextResponse } from "next/server";

const HERMES = process.env.HERMES_INTERNAL_URL || "http://localhost:4300";

interface HermesStatus {
  ok: boolean;
  channels: string[];
  model?: string;
  sessions?: number;
  gateway?: { running: boolean };
}

export async function GET() {
  try {
    const res = await fetch(`${HERMES}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({}, { status: 200 });
    }

    const data: HermesStatus = await res.json();
    const active = new Set((data.channels ?? []).map((c: string) => c.toLowerCase()));

    const channelsState = {
      discord:  { connected: active.has("discord") },
      telegram: { connected: active.has("telegram") },
      slack:    { connected: active.has("slack") },
      whatsapp: { connected: active.has("whatsapp") },
      signal:   { connected: active.has("signal") },
    };

    return NextResponse.json(channelsState);
  } catch {
    // Hermes down or not yet ready — return empty state (all disconnected)
    return NextResponse.json({});
  }
}
