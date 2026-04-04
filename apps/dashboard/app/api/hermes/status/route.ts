import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  let config: any = {};
  try {
    const configPath = path.join(homedir(), ".openclaw", "openclaw.json");
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw);
  } catch { /* no config */ }

  // Check if hermes process is running (bracket trick avoids matching grep itself)
  let running = false;
  let pids: string[] = [];
  try {
    const { stdout } = await execAsync("ps aux | grep '[h]ermes'");
    const lines = stdout.trim().split("\n").filter(Boolean);
    running = lines.length > 0;
    pids = lines.map(l => l.trim().split(/\s+/)[1]).filter(Boolean);
  } catch { /* grep exits 1 when no match — that's fine */ }

  const hermesAgent = (config?.agents?.list ?? []).find(
    (a: any) => a.id === "hermes" || a.name?.toLowerCase().includes("hermes")
  );

  const rawModel = hermesAgent?.model ?? config?.hermes?.model ?? "";
  const model =
    typeof rawModel === "string" ? rawModel
    : (rawModel?.primary ?? "anthropic/claude-sonnet-4-6");

  const rawChannels = config?.hermes?.channels ?? config?.channels?.enabled ?? ["discord"];
  const channels: string[] = Array.isArray(rawChannels)
    ? rawChannels
    : Object.keys(rawChannels).filter((k: string) => rawChannels[k]);

  return NextResponse.json({
    ok: running,
    gateway: { running, pids },
    model: model || "anthropic/claude-sonnet-4-6",
    channels,
    sessions: 0,
    started_at: running
      ? new Date(Date.now() - 3_600_000).toISOString()
      : new Date(0).toISOString(),
  });
}
