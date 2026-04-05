import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

// MCP server → capability metadata
const MCP_META: Record<string, { icon: string; description: string; category: string }> = {
  discord:         { icon: "💬", description: "Send messages, read channels, and manage Discord servers.", category: "communication" },
  twitter:         { icon: "🐦", description: "Post tweets, search, and interact with Twitter/X.", category: "communication" },
  slack:           { icon: "💼", description: "Send messages and monitor Slack channels.", category: "communication" },
  linkedin:        { icon: "🔗", description: "Post updates and manage LinkedIn presence.", category: "communication" },
  reddit:          { icon: "🟠", description: "Read and post to subreddits.", category: "communication" },
  notion:          { icon: "📝", description: "Read and write Notion pages and databases.", category: "productivity" },
  "notion-mcp":    { icon: "📝", description: "Read and write Notion pages and databases.", category: "productivity" },
  github:          { icon: "🐙", description: "Read repos, open issues, and review pull requests.", category: "productivity" },
  linear:          { icon: "📐", description: "Create and track Linear issues.", category: "productivity" },
  stripe:          { icon: "💳", description: "Query payments, customers, and invoices.", category: "productivity" },
  homey:           { icon: "🏠", description: "Control smart home devices via Homey.", category: "productivity" },
  "home-assistant": { icon: "🏡", description: "Control and automate Home Assistant devices.", category: "productivity" },
  playwright:      { icon: "🎭", description: "Automate browsers and scrape web pages.", category: "data" },
  context7:        { icon: "📚", description: "Access up-to-date library documentation.", category: "data" },
  superpowers:     { icon: "⚡", description: "Extended agent capabilities and tool access.", category: "data" },
  filesystem:      { icon: "📁", description: "Read and write files on the local filesystem.", category: "data" },
  memory:          { icon: "🧠", description: "Persistent memory storage for agents.", category: "data" },
  fetch:           { icon: "🌐", description: "Fetch web pages and external content.", category: "data" },
  postgres:        { icon: "🐘", description: "Query and update PostgreSQL databases.", category: "data" },
  "brave-search":  { icon: "🔍", description: "Search the web with Brave Search.", category: "data" },
};

function mcpToHand(name: string, cfg: Record<string, unknown>): object {
  const meta = MCP_META[name] ?? {
    icon: "🔌",
    description: `${name} MCP server`,
    category: "productivity",
  };
  const active = cfg?.enabled !== false;
  const hasEnvKey = cfg?.env ? Object.values(cfg.env as Record<string, string>).some(v => v && v.length > 0) : true;
  return {
    id: name,
    name: name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " Hand",
    icon: meta.icon,
    description: meta.description,
    active,
    requirements_met: hasEnvKey,
    degraded: false,
    category: meta.category,
  };
}

async function getHandsFromOpenClaw(): Promise<object[]> {
  const configPath =
    process.env.OPENCLAW_CONFIG_PATH ??
    path.join(homedir(), ".openclaw", "openclaw.json");
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw) as Record<string, unknown>;
  const servers = (config as any)?.mcp?.servers as Record<string, Record<string, unknown>> | undefined;
  if (!servers) return [];
  return Object.entries(servers).map(([name, cfg]) => mcpToHand(name, cfg));
}

export async function GET() {
  // 1. Try openfang
  try {
    const res = await fetch(`${OPENFANG}/api/hands`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as { hands?: unknown[] } | unknown[];
      const hands = Array.isArray(data) ? data : (data as { hands?: unknown[] }).hands ?? [];
      if (hands.length > 0) {
        return NextResponse.json({ hands });
      }
    }
  } catch { /* openfang unavailable */ }

  // 2. Fall back to openclaw.json MCP servers
  try {
    const hands = await getHandsFromOpenClaw();
    return NextResponse.json({ hands });
  } catch {
    return NextResponse.json({ hands: [] });
  }
}
