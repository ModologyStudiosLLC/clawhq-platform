import { NextResponse } from "next/server";
import { listContainers, restartContainer } from "@/lib/docker";

export const dynamic = "force-dynamic";

// Rate limit: 1 restart per service per 30s
const restartLog = new Map<string, number>();

export async function POST(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const now = Date.now();
  const last = restartLog.get(name) || 0;
  if (now - last < 30_000) {
    return NextResponse.json({ error: "Rate limited — wait 30s between restarts" }, { status: 429 });
  }
  restartLog.set(name, now);

  const containers = await listContainers();
  const container = containers.find(c => c.serviceName === name || c.name === name);
  if (!container) {
    return NextResponse.json({ error: "Container not found" }, { status: 404 });
  }

  const ok = await restartContainer(container.id);
  if (!ok) {
    return NextResponse.json({ error: "Restart failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, service: name });
}
