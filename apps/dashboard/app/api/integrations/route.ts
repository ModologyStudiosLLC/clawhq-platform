import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const INTEGRATIONS_FILE =
  process.env.CLAWHQ_INTEGRATIONS_FILE ??
  path.join(os.homedir(), ".clawhq", "integrations.json");

const OPENCLAW_CONFIG_FILE =
  process.env.OPENCLAW_CONFIG_PATH ??
  path.join(os.homedir(), ".openclaw", "openclaw.json");

interface IntegrationEntry {
  enabled: boolean;
  credential: string;
}

type IntegrationsData = Record<string, IntegrationEntry>;

// ── MCP server config builder ─────────────────────────────────────────────────
// Maps each integration ID to the MCP server config that OpenClaw's agent runner
// reads from config.mcp.servers. Matches the transport shapes in mcp-transport.ts.

function buildMcpServerConfig(
  id: string,
  credential: string,
): Record<string, unknown> | null {
  const c = credential.trim();
  switch (id) {
    case "filesystem":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", c],
      };
    case "memory":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        env: { MEMORY_FILE_PATH: c },
      };
    case "postgres":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", c],
      };
    case "brave-search":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        env: { BRAVE_API_KEY: c },
      };
    case "github":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: c },
      };
    case "slack":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-slack"],
        env: { SLACK_BOT_TOKEN: c },
      };
    case "notion":
      return {
        command: "npx",
        args: ["-y", "@notionhq/notion-mcp-server"],
        env: { OPENAPI_MCP_HEADERS: JSON.stringify({ Authorization: `Bearer ${c}`, "Notion-Version": "2022-06-28" }) },
      };
    case "linear":
      return {
        command: "npx",
        args: ["-y", "linear-mcp-server"],
        env: { LINEAR_API_KEY: c },
      };
    case "google-drive":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-gdrive"],
        env: { GDRIVE_CREDENTIALS_FILE: c.replace(/^~/, os.homedir()) },
      };
    default:
      return null;
  }
}

// ── OpenClaw config sync ──────────────────────────────────────────────────────
// Reads ~/.openclaw/openclaw.json, sets or removes entries under mcp.servers,
// then writes it back. Matches the logic in openclaw/src/config/mcp-config.ts.

async function syncMcpServers(integrations: IntegrationsData): Promise<void> {
  let config: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(OPENCLAW_CONFIG_FILE, "utf8");
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // File doesn't exist yet — start fresh
  }

  const mcp = (config.mcp as Record<string, unknown> | undefined) ?? {};
  const servers = (mcp.servers as Record<string, unknown> | undefined) ?? {};

  for (const [id, entry] of Object.entries(integrations)) {
    const serverName = `clawhq-${id}`;
    if (entry.enabled && entry.credential?.trim()) {
      const serverConfig = buildMcpServerConfig(id, entry.credential);
      if (serverConfig) {
        servers[serverName] = serverConfig;
      }
    } else {
      delete servers[serverName];
    }
  }

  if (Object.keys(servers).length > 0) {
    config.mcp = { ...mcp, servers };
  } else {
    const { servers: _removed, ...mcpWithout } = mcp as Record<string, unknown> & { servers?: unknown };
    if (Object.keys(mcpWithout).length > 0) {
      config.mcp = mcpWithout;
    } else {
      delete config.mcp;
    }
  }

  const dir = path.dirname(OPENCLAW_CONFIG_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OPENCLAW_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

// ── Integrations file helpers ────────────────────────────────────────────────

async function readIntegrations(): Promise<IntegrationsData> {
  try {
    const raw = await fs.readFile(INTEGRATIONS_FILE, "utf8");
    return JSON.parse(raw) as IntegrationsData;
  } catch {
    return {};
  }
}

async function writeIntegrations(data: IntegrationsData): Promise<void> {
  const dir = path.dirname(INTEGRATIONS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  const integrations = await readIntegrations();
  return NextResponse.json({ integrations });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<IntegrationsData>;
  const current = await readIntegrations();
  const merged: IntegrationsData = { ...current };
  for (const [id, entry] of Object.entries(body)) {
    merged[id] = { ...current[id], ...entry } as IntegrationEntry;
  }

  await writeIntegrations(merged);

  // Sync MCP server registrations into ~/.openclaw/openclaw.json so the
  // OpenClaw agent runner picks them up automatically on next session.
  try {
    await syncMcpServers(merged);
  } catch (err) {
    // Non-fatal: credentials are saved, MCP sync failed (e.g. OpenClaw not installed).
    // Log but don't fail the request.
    console.warn("[integrations] MCP sync failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ integrations: merged });
}
