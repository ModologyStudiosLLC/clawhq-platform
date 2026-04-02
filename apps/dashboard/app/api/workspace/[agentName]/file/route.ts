import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import os from "os";

const MAX_SIZE = 200_000; // 200KB — refuse to serve larger files

function workspacePath(agentName: string): string | null {
  const base = join(os.homedir(), ".openclaw");
  const name = agentName.toLowerCase();
  const path = name === "main" || name === "felix"
    ? join(base, "workspace")
    : join(base, `workspace-${name}`);
  const resolved = resolve(path);
  if (!resolved.startsWith(resolve(base))) return null;
  return resolved;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentName: string } }
) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const wsPath = workspacePath(params.agentName);
  if (!wsPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent path traversal
  const full = resolve(join(wsPath, filePath));
  if (!full.startsWith(wsPath)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!existsSync(full)) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let content: string;
  try {
    const buf = readFileSync(full);
    if (buf.length > MAX_SIZE) return NextResponse.json({ error: "File too large" }, { status: 413 });
    content = buf.toString("utf-8");
  } catch {
    return NextResponse.json({ error: "Read error" }, { status: 500 });
  }

  return NextResponse.json({ content, path: filePath });
}
