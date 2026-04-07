/**
 * Memory API — proxy to the Mem0 MCP server via a lightweight HTTP bridge.
 *
 * The Mem0 MCP server runs as a stdio process; we call it through a simple
 * JSON wrapper script so the dashboard can do add/search/list without
 * spawning an MCP client. For direct agent use, mem0 is registered as an
 * MCP server in ~/.hermes/config.yaml.
 *
 * Endpoints:
 *   POST /api/memory          { action: "add"|"search"|"get_all"|"delete"|"update", ...args }
 *   GET  /api/memory?q=...    quick semantic search shorthand
 */

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const MEM0_SCRIPT = path.join(os.homedir(), ".hermes", "servers", "mem0_mcp_server.py");
const PYTHON = process.env.MEM0_PYTHON ?? path.join(os.homedir(), "miniforge3", "bin", "python3");
const DEFAULT_USER_ID = process.env.MEM0_DEFAULT_USER_ID ?? "clawhq";

/** Run a single MCP tool call against the mem0 server via stdin/stdout */
async function callMem0Tool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });

  // Prepend an initialize call so the server starts up properly
  const initReq = JSON.stringify({
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "dashboard", version: "1.0" } },
  });

  const stdin = `${initReq}\n${request}\n`;

  const { stdout } = await execFileAsync(PYTHON, [MEM0_SCRIPT], {
    input: stdin,
    timeout: 30_000,
    env: { ...process.env, PATH: `${os.homedir()}/miniforge3/bin:${process.env.PATH}` },
  });

  // Parse last non-empty line with id=1
  const lines = stdout.trim().split("\n").filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1) {
        if (parsed.error) throw new Error(parsed.error.message);
        const content = parsed.result?.content?.[0]?.text;
        return content ? JSON.parse(content) : parsed.result;
      }
    } catch {
      continue;
    }
  }
  throw new Error("No valid response from mem0 server");
}

// ── GET /api/memory?q=search+query ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const userId = req.nextUrl.searchParams.get("user_id") ?? DEFAULT_USER_ID;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");

  if (!q) {
    // List all
    try {
      const result = await callMem0Tool("mem0_get_all", { user_id: userId, limit });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  try {
    const result = await callMem0Tool("mem0_search", { query: q, user_id: userId, limit });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST /api/memory ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = (body.action as string) ?? "add";
  const userId = (body.user_id as string) ?? DEFAULT_USER_ID;

  const toolMap: Record<string, string> = {
    add:     "mem0_add",
    search:  "mem0_search",
    get_all: "mem0_get_all",
    delete:  "mem0_delete",
    update:  "mem0_update",
  };

  const toolName = toolMap[action];
  if (!toolName) {
    return NextResponse.json({ error: `Unknown action: ${action}. Use: ${Object.keys(toolMap).join(", ")}` }, { status: 400 });
  }

  try {
    const result = await callMem0Tool(toolName, { ...body, user_id: userId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
