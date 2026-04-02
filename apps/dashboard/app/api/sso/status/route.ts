import { NextResponse } from "next/server";

// Returns SSO and directory sync status via WorkOS API.
// Falls back gracefully if the WorkOS API key is not configured.

export const dynamic = "force-dynamic";

const WORKOS_API_KEY = process.env.WORKOS_API_KEY;
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;

async function workosGet(path: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  if (!WORKOS_API_KEY) return { ok: false, error: "WORKOS_API_KEY not configured" };
  try {
    const res = await fetch(`https://api.workos.com${path}`, {
      headers: { Authorization: `Bearer ${WORKOS_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `WorkOS API: ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function GET() {
  const configured = !!(WORKOS_API_KEY && WORKOS_CLIENT_ID);

  if (!configured) {
    return NextResponse.json({
      configured: false,
      sso: { enabled: false, connections: [] },
      directory: { enabled: false, directories: [] },
    });
  }

  const [ssoRes, dirRes] = await Promise.all([
    workosGet("/sso/connections?limit=10"),
    workosGet("/directory_sync/directories?limit=10"),
  ]);

  type Connection = { id: string; name: string; state: string; connection_type: string; domains: { domain: string }[] };
  type Directory = { id: string; name: string; state: string; type: string };

  const connections: Connection[] = (ssoRes.ok && ssoRes.data && typeof ssoRes.data === "object" && "data" in ssoRes.data)
    ? (ssoRes.data as { data: Connection[] }).data
    : [];
  const directories: Directory[] = (dirRes.ok && dirRes.data && typeof dirRes.data === "object" && "data" in dirRes.data)
    ? (dirRes.data as { data: Directory[] }).data
    : [];

  return NextResponse.json({
    configured: true,
    sso: {
      enabled: connections.some(c => c.state === "active"),
      connections: connections.map(c => ({
        id: c.id,
        name: c.name,
        state: c.state,
        type: c.connection_type,
        domains: c.domains?.map(d => d.domain) ?? [],
      })),
    },
    directory: {
      enabled: directories.some(d => d.state === "linked"),
      directories: directories.map(d => ({
        id: d.id,
        name: d.name,
        state: d.state,
        type: d.type,
      })),
    },
  });
}
