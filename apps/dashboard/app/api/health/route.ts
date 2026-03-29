import { NextResponse } from "next/server";

const OPENCLAW = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789";
const PAPERCLIP = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || "http://localhost:3100";
const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

async function check(name: string, url: string, path: string) {
  try {
    const res = await fetch(`${url}${path}`, { next: { revalidate: 0 }, signal: AbortSignal.timeout(3000) });
    return { name, ok: res.ok, status: res.ok ? "healthy" : "degraded" };
  } catch {
    return { name, ok: false, status: "offline" };
  }
}

export async function GET() {
  const [openclaw, paperclip, openfang] = await Promise.all([
    check("OpenClaw", OPENCLAW, "/healthz"),
    check("Paperclip", PAPERCLIP, "/api/companies"),
    check("OpenFang", OPENFANG, "/api/metrics"),
  ]);

  const all = [openclaw, paperclip, openfang];
  const allHealthy = all.every(s => s.ok);

  return NextResponse.json({ services: all, allHealthy });
}
