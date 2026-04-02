import { NextResponse } from "next/server";
import { listContainers, getContainerStats, inspectContainer, formatUptime } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET() {
  const containers = await listContainers();
  const enriched = await Promise.all(
    containers.map(async (c) => {
      const [stats, inspect] = await Promise.all([
        getContainerStats(c.id),
        inspectContainer(c.id),
      ]);
      return {
        ...c,
        ...stats,
        exitCode: inspect.exitCode,
        startedAt: inspect.startedAt,
        uptime: inspect.startedAt && c.status === "running"
          ? formatUptime(inspect.startedAt)
          : c.uptime,
      };
    })
  );
  return NextResponse.json(enriched);
}
