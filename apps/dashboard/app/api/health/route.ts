import { NextResponse } from "next/server";

const OPENCLAW = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789";
const PAPERCLIP = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || "http://localhost:3100";
const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
// Hermes in local dev runs as a Discord gateway bot (no HTTP API).
// Mark it as optional so its absence doesn't fail overall health.
const HERMES = process.env.HERMES_INTERNAL_URL || process.env.NEXT_PUBLIC_HERMES_URL || "";

async function check(name: string, url: string, path: string, optional = false) {
  if (!url) return { name, ok: true, status: "not-configured", optional: true };
  try {
    const res = await fetch(`${url}${path}`, { next: { revalidate: 0 }, signal: AbortSignal.timeout(3000) });
    return { name, ok: res.ok, status: res.ok ? "healthy" : "degraded", optional };
  } catch {
    return { name, ok: optional, status: "offline", optional };
  }
}

export async function GET() {
  const [openclaw, paperclip, openfang, hermes] = await Promise.all([
    check("OpenClaw", OPENCLAW, "/healthz"),
    check("Paperclip", PAPERCLIP, "/api/companies"),
    check("OpenFang", OPENFANG, "/api/health"),
    check("Hermes", HERMES, "/health", true),
  ]);

  const all = [openclaw, paperclip, openfang, hermes];
  const allHealthy = all.filter(s => !s.optional).every(s => s.ok);

  return NextResponse.json({ services: all, allHealthy });
}
