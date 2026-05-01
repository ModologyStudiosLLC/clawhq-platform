import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

// Provider → canonical name mapping
const PROVIDER_MAP: Record<string, string> = {
  anthropic: "anthropic",
  openrouter: "anthropic",
  zai: "zai",
  deepseek: "deepseek",
  xiaomi: "xiaomi",
  ollama: "ollama",
  openai: "openai",
  groq: "groq",
};

function resolveModel(model: any): { name: string; provider: string } {
  if (typeof model === "string") {
    const [provider, ...rest] = model.split("/");
    return { name: rest.join("/") || provider, provider: PROVIDER_MAP[provider] || provider };
  }
  if (model && typeof model === "object") {
    const primary: string = model.primary || "";
    const [provider, ...rest] = primary.split("/");
    return { name: rest.join("/") || provider, provider: PROVIDER_MAP[provider] || provider };
  }
  return { name: "unknown", provider: "unknown" };
}

// Ping openclaw gateway to check if an agent is actively running
const OPENCLAW = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789";

async function isGatewayLive(): Promise<boolean> {
  try {
    const r = await fetch(`${OPENCLAW}/healthz`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

export async function GET() {
  try {
    const configPath = path.join(homedir(), ".openclaw", "openclaw.json");
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw);

    const agentList: any[] = config?.agents?.list ?? [];
    const gatewayLive = await isGatewayLive();

    // Try to get live per-agent state from openclaw gateway
    let liveStates: Record<string, string> = {};
    if (gatewayLive) {
      try {
        const r = await fetch(`${OPENCLAW}/agents`, { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          const liveList: any[] = await r.json();
          for (const la of liveList) {
            if (la.id) liveStates[la.id] = la.state ?? "Running";
          }
        }
      } catch { /* use fallback below */ }
    }

    const agents = agentList.map((a: any) => {
      const { name: model_name, provider: model_provider } = resolveModel(a.model);
      const state = !gatewayLive ? "Offline" : (liveStates[a.id] ?? "Running");
      const last_active = a.heartbeat ?? a.last_active ?? null;
      return {
        id: a.id,
        name: a.name,
        state,
        model_name,
        model_provider,
        ready: gatewayLive,
        last_active,
        profile: a.profile ?? null,
        workspace: a.workspace ?? null,
      };
    });

    return NextResponse.json(agents);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
