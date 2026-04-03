import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const INTEGRATIONS_FILE =
  process.env.CLAWHQ_INTEGRATIONS_FILE ??
  path.join(os.homedir(), ".clawhq", "integrations.json");

interface IntegrationEntry {
  enabled: boolean;
  credential: string;
}

type IntegrationsData = Record<string, IntegrationEntry>;

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
  return NextResponse.json({ integrations: merged });
}
