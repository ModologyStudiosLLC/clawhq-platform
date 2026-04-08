import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const AUDIT_FILE =
  process.env.CLAWHQ_AUDIT_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/audit-log.json"
    : path.join(process.cwd(), ".audit-log.dev.json"));

const MAX_ENTRIES = 1000;

export interface AuditEntry {
  id: string;
  ts: number;
  actor: string; // "system" or user email
  action: string; // e.g. "settings.updated", "key.created", "key.revoked"
  detail: string;
  diff?: Record<string, unknown>;
}

async function readLog(): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf8");
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

async function appendEntry(entry: AuditEntry): Promise<void> {
  const log = await readLog();
  log.push(entry);
  const trimmed = log.slice(-MAX_ENTRIES);
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await fs.writeFile(AUDIT_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200"), 500);
  const log = await readLog();
  return NextResponse.json(log.slice(-limit).reverse());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<AuditEntry, "id" | "ts">;
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    actor: body.actor ?? "system",
    action: body.action,
    detail: body.detail,
    diff: body.diff,
  };
  await appendEntry(entry);
  return NextResponse.json(entry, { status: 201 });
}

// Helper exported for server-side use (settings route, etc.)
export async function logAudit(
  action: string,
  detail: string,
  diff?: Record<string, unknown>,
  actor = "system",
): Promise<void> {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    actor,
    action,
    detail,
    diff,
  };
  await appendEntry(entry).catch(() => {/* best-effort */});
}
