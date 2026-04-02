import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";
import os from "os";

// Config files that are part of agent identity — not output files
const CONFIG_FILES = new Set([
  "IDENTITY.md", "PROGRAM.md", "BOOTSTRAP.md", "SOUL.md", "USER.md",
  "AGENTS.md", "TOOLS.md", "HEARTBEAT.md", "NIGHTLY_BUILD.md",
  "WEEKLY_CLEANUP.md", "README.md",
]);

function workspacePath(agentName: string): string | null {
  const base = join(os.homedir(), ".openclaw");
  const name = agentName.toLowerCase();
  const path = name === "main" || name === "felix"
    ? join(base, "workspace")
    : join(base, `workspace-${name}`);
  // Prevent path traversal
  const resolved = resolve(path);
  if (!resolved.startsWith(resolve(base))) return null;
  return resolved;
}

interface WorkspaceFile {
  name: string;
  path: string; // relative to workspace root
  size: number;
  modified: number;
  dir: string;
}

function listFiles(dir: string, root: string, depth = 0): WorkspaceFile[] {
  if (depth > 3) return [];
  let results: WorkspaceFile[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }

    if (stat.isDirectory()) {
      // Recurse into output dirs; skip node_modules and chroma_db
      if (["node_modules", "chroma_db", "legal-compliance-platform"].includes(entry)) continue;
      results = results.concat(listFiles(full, root, depth + 1));
    } else if (stat.isFile() && entry.endsWith(".md") || entry.endsWith(".json") || entry.endsWith(".txt")) {
      if (depth === 0 && CONFIG_FILES.has(entry)) continue;
      results.push({
        name: entry,
        path: relative(root, full),
        size: stat.size,
        modified: stat.mtimeMs,
        dir: relative(root, dir) || ".",
      });
    }
  }
  return results;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  const wsPath = workspacePath(agentName);
  if (!wsPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const files = listFiles(wsPath, wsPath)
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 100);

  return NextResponse.json({ files, root: wsPath });
}
