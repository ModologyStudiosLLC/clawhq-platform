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

async function testGitHub(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Personal access token is required." };
  }
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${credential.trim()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { login?: string };
      return { ok: true, message: `Connected as @${data.login ?? "unknown"}.` };
    }
    if (res.status === 401) {
      return { ok: false, message: "Invalid or expired GitHub token." };
    }
    return { ok: false, message: `GitHub API returned HTTP ${res.status}.` };
  } catch (err) {
    return { ok: false, message: `Could not reach GitHub API: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function testSlack(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Bot token is required." };
  }
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential.trim()}`,
        "Content-Type": "application/json",
      },
    });
    const data = (await res.json()) as { ok: boolean; team?: string; user?: string; error?: string };
    if (data.ok) {
      return { ok: true, message: `Connected to workspace "${data.team}" as ${data.user}.` };
    }
    return { ok: false, message: `Slack auth failed: ${data.error ?? "unknown error"}.` };
  } catch (err) {
    return { ok: false, message: `Could not reach Slack API: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function testNotion(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Integration token is required." };
  }
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${credential.trim()}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { name?: string; type?: string };
      return { ok: true, message: `Connected as "${data.name ?? "integration"}" (${data.type ?? "bot"}).` };
    }
    if (res.status === 401) {
      return { ok: false, message: "Invalid or revoked Notion integration token." };
    }
    return { ok: false, message: `Notion API returned HTTP ${res.status}.` };
  } catch (err) {
    return { ok: false, message: `Could not reach Notion API: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function testLinear(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "API key is required." };
  }
  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: credential.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "{ viewer { name email } }" }),
    });
    const data = (await res.json()) as { data?: { viewer?: { name?: string; email?: string } }; errors?: unknown[] };
    if (data.data?.viewer?.name) {
      return { ok: true, message: `Connected as ${data.data.viewer.name} (${data.data.viewer.email ?? ""}).` };
    }
    if (data.errors) {
      return { ok: false, message: "Invalid Linear API key." };
    }
    return { ok: false, message: `Linear API returned unexpected response.` };
  } catch (err) {
    return { ok: false, message: `Could not reach Linear API: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function testGoogleDrive(credential: string): Promise<TestResult> {
  if (!credential.trim()) {
    return { ok: false, message: "Service account JSON path is required." };
  }
  const p = credential.trim().replace(/^~/, process.env.HOME ?? "");
  try {
    await fs.access(p);
    const raw = await fs.readFile(p, "utf8");
    const sa = JSON.parse(raw) as { type?: string; client_email?: string };
    if (sa.type !== "service_account") {
      return { ok: false, message: "File is not a service account JSON (missing type: service_account)." };
    }
    return { ok: true, message: `Service account loaded: ${sa.client_email ?? "unknown"}.` };
  } catch (err) {
    return { ok: false, message: `Could not read service account file: ${err instanceof Error ? err.message : String(err)}` };
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
    case "github":
      result = await testGitHub(credential);
      break;
    case "slack":
      result = await testSlack(credential);
      break;
    case "notion":
      result = await testNotion(credential);
      break;
    case "linear":
      result = await testLinear(credential);
      break;
    case "google-drive":
      result = await testGoogleDrive(credential);
      break;
    default:
      result = { ok: false, message: `Unknown integration: ${id}` };
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
