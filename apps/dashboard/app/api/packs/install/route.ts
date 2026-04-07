import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const REGISTRY_URL = process.env.PACK_REGISTRY_URL ?? "https://packs.clawhqplatform.com";
const PACKS_DIR = process.env.CLAWHQ_PACKS_DIR ?? path.join(os.homedir(), ".clawhq", "packs");
// Local pack source for dev/trial installs (the clawhq-packs repo checkout)
const LOCAL_PACKS_SRC = process.env.CLAWHQ_LOCAL_PACKS_SRC ?? path.join(os.homedir(), ".openclaw", "workspace", "clawhq-packs");

// CLAWHQ_TRIAL_KEYS — comma-separated list of keys that bypass the registry
// and install directly from the local pack source. Set in .env.local.
// e.g. CLAWHQ_TRIAL_KEYS=TRIAL-ALPHA-2026,TRIAL-BETA-2026
function getTrialKeys(): Set<string> {
  const raw = process.env.CLAWHQ_TRIAL_KEYS ?? "";
  return new Set(raw.split(",").map(k => k.trim().toUpperCase()).filter(Boolean));
}

export async function POST(request: Request) {
  const { key, packId } = await request.json() as { key?: string; packId?: string };
  if (!key || !packId) {
    return NextResponse.json({ error: "key and packId required" }, { status: 400 });
  }

  // Sanitize packId — alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(packId)) {
    return NextResponse.json({ error: "invalid packId" }, { status: 400 });
  }

  const normalizedKey = key.trim().toUpperCase();

  // Trial key path — serve directly from local pack source, no registry call
  if (getTrialKeys().has(normalizedKey)) {
    const localPath = path.join(LOCAL_PACKS_SRC, `${packId}.yaml`);
    try {
      const yaml = await fs.readFile(localPath, "utf8");
      await fs.mkdir(PACKS_DIR, { recursive: true });
      await fs.writeFile(path.join(PACKS_DIR, `${packId}.yaml`), yaml, "utf8");
      return NextResponse.json({ ok: true, filename: `${packId}.yaml`, trial: true });
    } catch {
      return NextResponse.json({ error: `Pack '${packId}' not found in trial catalog` }, { status: 404 });
    }
  }

  // Standard path — fetch from registry
  const res = await fetch(
    `${REGISTRY_URL}/download?key=${encodeURIComponent(normalizedKey)}&pack=${encodeURIComponent(packId)}`,
    { signal: AbortSignal.timeout(10000) }
  ).catch(() => null);

  if (!res) return NextResponse.json({ error: "registry unreachable" }, { status: 502 });
  if (res.status === 403) return NextResponse.json({ error: "invalid key or pack not licensed" }, { status: 403 });
  if (!res.ok) return NextResponse.json({ error: "registry error" }, { status: res.status });

  const yaml = await res.text();

  await fs.mkdir(PACKS_DIR, { recursive: true });
  const filename = `${packId}.yaml`;
  await fs.writeFile(path.join(PACKS_DIR, filename), yaml, "utf8");

  return NextResponse.json({ ok: true, filename });
}

export async function GET() {
  try {
    await fs.mkdir(PACKS_DIR, { recursive: true });
    const files = await fs.readdir(PACKS_DIR);
    const packs = files
      .filter(f => f.endsWith(".yaml"))
      .map(f => f.replace(".yaml", ""));
    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json({ packs: [] });
  }
}

export async function DELETE(request: Request) {
  const { packId } = await request.json() as { packId?: string };
  if (!packId) return NextResponse.json({ error: "packId required" }, { status: 400 });

  // Sanitize: only allow alphanumeric + hyphens to prevent path traversal
  if (!/^[a-z0-9-]+$/.test(packId)) {
    return NextResponse.json({ error: "invalid packId" }, { status: 400 });
  }

  const filepath = path.join(PACKS_DIR, `${packId}.yaml`);
  await fs.unlink(filepath).catch(() => null);
  return NextResponse.json({ ok: true });
}
