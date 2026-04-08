import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { ApiKeyRecord } from "../route.js";

const KEYS_FILE =
  process.env.CLAWHQ_KEYS_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/api-keys.json"
    : path.join(process.cwd(), ".api-keys.dev.json"));

async function readKeys(): Promise<ApiKeyRecord[]> {
  try {
    const raw = await fs.readFile(KEYS_FILE, "utf8");
    return JSON.parse(raw) as ApiKeyRecord[];
  } catch {
    return [];
  }
}

async function writeKeys(keys: ApiKeyRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(KEYS_FILE), { recursive: true });
  await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf8");
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const keys = await readKeys();
  const idx = keys.findIndex(k => k.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  keys[idx] = { ...keys[idx], revokedAt: Date.now() };
  await writeKeys(keys);
  return NextResponse.json({ ok: true });
}
