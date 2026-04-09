import { NextResponse } from "next/server";
import { notifyHealthAlert } from "../../../lib/notify";

const OPENCLAW = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789";
const PAPERCLIP = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || "http://localhost:3100";
const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
const HERMES        = process.env.HERMES_INTERNAL_URL || process.env.NEXT_PUBLIC_HERMES_URL || "";
const ORCHESTRATION = process.env.ORCHESTRATION_URL  || "http://localhost:4400";

const SETTINGS_FILE =
  process.env.CLAWHQ_SETTINGS_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/settings.json"
    : `${process.cwd()}/.settings.dev.json`);

// Module-level failure counters (persists for the process lifetime)
const failureCounts: Record<string, number> = {};
const lastNotifiedAt: Record<string, number> = {};
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000; // notify at most every 30 min per service

async function check(name: string, url: string, checkPath: string, optional = false) {
  if (!url) return { name, ok: true, status: "not-configured", optional: true };
  try {
    const res = await fetch(`${url}${checkPath}`, { next: { revalidate: 0 }, signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      failureCounts[name] = 0; // reset on success
    }
    return { name, ok: res.ok, status: res.ok ? "healthy" : "degraded", optional };
  } catch {
    failureCounts[name] = (failureCounts[name] ?? 0) + 1;
    return { name, ok: optional, status: "offline", optional };
  }
}

async function getNotificationSettings() {
  try {
    const { promises: fs } = await import("fs");
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    const settings = JSON.parse(raw) as Record<string, unknown>;
    return (settings.notifications ?? {}) as {
      slackWebhookUrl?: string;
      healthAlertEnabled?: boolean;
      healthFailureThreshold?: number;
    };
  } catch {
    return {};
  }
}

export async function GET() {
  const [openclaw, paperclip, openfang, hermes, orchestration] = await Promise.all([
    check("OpenClaw",      OPENCLAW,      "/healthz"),
    check("Paperclip",     PAPERCLIP,     "/api/health"),
    check("OpenFang",      OPENFANG,      "/api/health"),
    check("Hermes",        HERMES,        "/health",  true),
    check("Orchestration", ORCHESTRATION, "/healthz", true),
  ]);

  const all = [openclaw, paperclip, openfang, hermes, orchestration];
  const allHealthy = all.filter(s => !s.optional).every(s => s.ok);

  // Fire health notifications for services that have exceeded the failure threshold
  if (!allHealthy) {
    const notifSettings = await getNotificationSettings();
    const threshold = notifSettings.healthFailureThreshold ?? 3;
    const now = Date.now();

    for (const svc of all) {
      if (svc.optional) continue;
      const failures = failureCounts[svc.name] ?? 0;
      if (failures >= threshold) {
        const lastNotified = lastNotifiedAt[svc.name] ?? 0;
        if (now - lastNotified > NOTIFY_COOLDOWN_MS) {
          lastNotifiedAt[svc.name] = now;
          await notifyHealthAlert(notifSettings, svc.name, failures);
        }
      }
    }
  }

  return NextResponse.json({ services: all, allHealthy });
}
