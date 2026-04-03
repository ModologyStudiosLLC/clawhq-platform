import { NextResponse } from "next/server";
import { promises as fs } from "fs";

interface TestResult {
  ok: boolean;
  message: string;
}

// ── Per-integration connectivity tests ────────────────────────────────────────

async function testFilesystem(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Root path is required." };
  }
  try {
    await fs.access(credential.trim());
    return { ok: true, message: `Path exists and is accessible.` };
  } catch {
    return { ok: false, message: `Path does not exist or is not accessible: ${credential}` };
  }
}

async function testMemory(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Storage path is required." };
  }
  const storagePath = credential.trim();
  try {
    // Check if directory exists; if not, attempt to create it
    try {
      await fs.access(storagePath);
    } catch {
      await fs.mkdir(storagePath, { recursive: true });
    }
    // Write a probe file to confirm writability
    const probeFile = `${storagePath}/.clawhq-memory-probe`;
    await fs.writeFile(probeFile, "probe", "utf8");
    await fs.unlink(probeFile);
    return { ok: true, message: "Storage path is writable." };
  } catch (err) {
    return { ok: false, message: `Storage path is not writable: ${String(err)}` };
  }
}

async function testPostgres(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Connection string is required." };
  }
  // Dynamic import so pg is optional at build time — gracefully handle missing dep.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require("pg") as { Client: new (opts: { connectionString: string }) => { connect(): Promise<void>; query(sql: string): Promise<unknown>; end(): Promise<void> } };
    const client = new Client({ connectionString: credential.trim() });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return { ok: true, message: "PostgreSQL connection successful." };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `PostgreSQL connection failed: ${message}` };
  }
}

async function testBraveSearch(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "API key is required." };
  }
  try {
    const res = await fetch("https://api.search.brave.com/res/v1/web/search?q=test&count=1", {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": credential.trim(),
      },
    });
    if (res.ok) {
      return { ok: true, message: "Brave Search API key is valid." };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Invalid or unauthorized Brave Search API key." };
    }
    return { ok: false, message: `Brave Search API returned HTTP ${res.status}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Could not reach Brave Search API: ${message}` };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as { credential?: string };
  const credential = body.credential ?? "";

  let result: TestResult;

  switch (id) {
    case "filesystem":
      result = await testFilesystem(credential);
      break;
    case "memory":
      result = await testMemory(credential);
      break;
    case "postgres":
      result = await testPostgres(credential);
      break;
    case "brave-search":
      result = await testBraveSearch(credential);
      break;
    default:
      result = { ok: false, message: `Unknown integration: ${id}` };
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
