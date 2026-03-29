const OPENCLAW_URL = process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789";
const PAPERCLIP_URL = process.env.NEXT_PUBLIC_PAPERCLIP_URL || "http://localhost:3100";
const OPENFANG_URL = process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getAgents() {
  try {
    return await fetchJson<any[]>(`${PAPERCLIP_URL}/api/agents`);
  } catch {
    return [];
  }
}

export async function getAgentById(id: string) {
  try {
    return await fetchJson<any>(`${PAPERCLIP_URL}/api/agents/${id}`);
  } catch {
    return null;
  }
}

export async function getOpenFangHealth() {
  try {
    return await fetchJson<any>(`${OPENFANG_URL}/health`);
  } catch {
    return null;
  }
}

export async function getOpenClawStatus() {
  try {
    return await fetchJson<any>(`${OPENCLAW_URL}/api/status`);
  } catch {
    return null;
  }
}
