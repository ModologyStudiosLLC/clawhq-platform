import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { encrypt, decrypt } from "../../../lib/encrypt.js";

const INTEGRATIONS_FILE =
  process.env.CLAWHQ_INTEGRATIONS_FILE ??
  path.join(os.homedir(), ".clawhq", "integrations.json");

const OPENCLAW_CONFIG_FILE =
  process.env.OPENCLAW_CONFIG_PATH ??
  path.join(os.homedir(), ".openclaw", "openclaw.json");

interface IntegrationEntry {
  enabled: boolean;
  credential: string; // stored encrypted; plaintext in memory only
}

type IntegrationsData = Record<string, IntegrationEntry>;

// ── MCP server config builder ─────────────────────────────────────────────────

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
    case "fetch":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
        ...(c ? { env: { USER_AGENT: c } } : {}),
      };
    case "puppeteer":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
        ...(c ? { env: { PUPPETEER_EXECUTABLE_PATH: c } } : {}),
      };
    case "sequential-thinking":
      return {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      };
    case "obsidian":
      return {
        command: "npx",
        args: ["-y", "mcp-obsidian"],
        env: {
          OBSIDIAN_API_KEY: c,
          OBSIDIAN_HOST: "localhost",
          OBSIDIAN_PORT: "27123",
        },
      };
    case "cloudflare":
      return {
        command: "npx",
        args: ["-y", "@cloudflare/mcp-server-cloudflare"],
        env: { CLOUDFLARE_API_TOKEN: c },
      };
    default:
      return null;
  }
}

// ── OpenClaw config sync ──────────────────────────────────────────────────────

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
    // entry.credential is already decrypted plaintext here (from readIntegrations).
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

// ── Integrations file helpers ─────────────────────────────────────────────────
// Credentials are stored encrypted. On read, they are decrypted for internal
// use (MCP sync, test handlers). The GET handler masks them before sending
// to the browser — the plaintext is never sent over the wire after initial save.

async function readIntegrations(): Promise<IntegrationsData> {
  try {
    const raw = await fs.readFile(INTEGRATIONS_FILE, "utf8");
    const stored = JSON.parse(raw) as IntegrationsData;
    // Decrypt all credentials — handles plaintext migration transparently.
    return Object.fromEntries(
      Object.entries(stored).map(([id, entry]) => [
        id,
        { ...entry, credential: decrypt(entry.credential) },
      ]),
    );
  } catch {
    return {};
  }
}

async function writeIntegrations(data: IntegrationsData): Promise<void> {
  const dir = path.dirname(INTEGRATIONS_FILE);
  await fs.mkdir(dir, { recursive: true });
  // Encrypt all credentials before persisting.
  const toStore: IntegrationsData = Object.fromEntries(
    Object.entries(data).map(([id, entry]) => [
      id,
      { ...entry, credential: encrypt(entry.credential) },
    ]),
  );
  await fs.writeFile(INTEGRATIONS_FILE, JSON.stringify(toStore, null, 2), "utf8");
}

/** Mask a credential for the GET response — never send plaintext to the browser. */
function maskCredential(credential: string): string {
  if (!credential) return "";
  // Show just enough to confirm something is set.
  return credential.length > 8
    ? credential.slice(0, 4) + "••••••••"
    : "••••••••";
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  const integrations = await readIntegrations();
  // Return masked credentials — the UI only needs to know "set / not set".
  const masked = Object.fromEntries(
    Object.entries(integrations).map(([id, entry]) => [
      id,
      { ...entry, credential: maskCredential(entry.credential) },
    ]),
  );
  return NextResponse.json({ integrations: masked });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<IntegrationsData>;
  const current = await readIntegrations();
  const merged: IntegrationsData = { ...current };

  for (const [id, entry] of Object.entries(body)) {
    if (!entry) continue;
    // If the incoming credential is a masked value (••••), keep the existing one.
    const incomingCredential = entry.credential ?? "";
    const isMasked = incomingCredential.includes("•");
    merged[id] = {
      ...current[id],
      ...entry,
      credential: isMasked ? (current[id]?.credential ?? "") : incomingCredential,
    } as IntegrationEntry;
  }

  await writeIntegrations(merged);

  try {
    await syncMcpServers(merged);
  } catch (err) {
    console.warn("[integrations] MCP sync failed:", err instanceof Error ? err.message : err);
  }

  // Return masked — same as GET.
  const masked = Object.fromEntries(
    Object.entries(merged).map(([id, entry]) => [
      id,
      { ...entry, credential: maskCredential(entry.credential) },
    ]),
  );
  return NextResponse.json({ integrations: masked });
}
