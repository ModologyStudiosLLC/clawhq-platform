import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";

const KEYS_FILE =
  process.env.CLAWHQ_KEYS_FILE ??
  (process.env.NODE_ENV === "production"
    ? "/data/api-keys.json"
    : path.join(process.cwd(), ".api-keys.dev.json"));

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string; // first 8 chars — safe to display
  hash: string;   // SHA-256 of full key — never returned
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
}

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

// Returns public view (no hash)
function publicKey(k: ApiKeyRecord): Omit<ApiKeyRecord, "hash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, ...pub } = k;
  return pub;
}

export async function GET() {
  const keys = await readKeys();
  return NextResponse.json(keys.map(publicKey));
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const raw = `chq_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12); // "chq_" + first 8 hex chars
  const hash = createHash("sha256").update(raw).digest("hex");

  const record: ApiKeyRecord = {
    id: randomBytes(8).toString("hex"),
    name: body.name.trim(),
    prefix,
    hash,
    createdAt: Date.now(),
  };

  const keys = await readKeys();
  keys.push(record);
  await writeKeys(keys);

  // Return the full key only this once
  return NextResponse.json({ ...publicKey(record), key: raw }, { status: 201 });
}
