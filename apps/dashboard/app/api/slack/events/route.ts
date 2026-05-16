/**
 * POST /api/slack/events
 *
 * Receives Slack Events API payloads (app_mention), verifies the request
 * signature, and dispatches the task to a ClawHQ agent asynchronously.
 *
 * Slack app requirements:
 *   - Event Subscriptions enabled, Request URL: <dashboard>/api/slack/events
 *   - Bot event subscription: app_mention
 *   - OAuth scopes: app_mentions:read, chat:write
 *
 * Config (either env var or Settings → Notifications):
 *   SLACK_SIGNING_SECRET   — from Slack app Basic Information
 *   SLACK_BOT_TOKEN        — or set in Settings → Integrations → Slack
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "../../settings/route";
import { readIntegrations } from "../../integrations/route";
import { slackAgentDispatch, type SlackMentionEvent } from "../../../../lib/slack-agent-dispatch";

function verifySlackSignature(
  rawBody: string,
  signingSecret: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  if (!signingSecret || !signature || !timestamp) return false;

  // Reject requests older than 5 minutes (replay attack prevention).
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false;

  const expected = `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false; // length mismatch
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Resolve signing secret — env var takes priority over stored settings.
  const settings = await readSettings();
  const signingSecret =
    process.env.SLACK_SIGNING_SECRET ||
    settings.notifications.slackSigningSecret;

  if (
    !verifySlackSignature(
      rawBody,
      signingSecret,
      req.headers.get("x-slack-signature"),
      req.headers.get("x-slack-request-timestamp"),
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Slack sends this once when you first configure the Request URL.
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Only dispatch when inbound trigger is enabled.
  if (!settings.notifications.slackInboundEnabled) {
    return NextResponse.json({ ok: true });
  }

  const event = body.event as Record<string, unknown> | undefined;
  if (event?.type === "app_mention") {
    // Resolve bot token — env var takes priority over stored integration.
    const integrations = await readIntegrations();
    const botToken =
      process.env.SLACK_BOT_TOKEN ||
      integrations["slack"]?.credential ||
      "";

    if (botToken) {
      // Fire-and-forget — Slack requires a response within 3 seconds.
      void slackAgentDispatch(event as unknown as SlackMentionEvent, botToken);
    }
  }

  return NextResponse.json({ ok: true });
}
