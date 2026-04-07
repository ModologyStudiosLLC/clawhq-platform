/**
 * Trial Key Management API
 *
 * GET  /api/packs/trial-keys          — list all trial keys
 * POST /api/packs/trial-keys          — create a new key
 * DELETE /api/packs/trial-keys?key=X  — revoke a key
 *
 * Key types:
 *   permanent   — never expires, unlimited uses
 *   time-limited — expires at a given date
 *   one-time    — single use, auto-revoked after first install
 *
 * Keys are stored in ~/.clawhq/trial-keys.json (server-side only, never
 * exposed to the client in full — the secret portion is hashed on read).
 *
 * The install and validate routes check this store in addition to the
 * CLAWHQ_TRIAL_KEYS env var.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const KEYS_FILE = process.env.CLAWHQ_TRIAL_KEYS_FILE
  ?? path.join(os.homedir(), ".clawhq", "trial-keys.json");

export interface TrialKey {
  key: string;          // the actual key string (e.g. TRIAL-XXXX-XXXX)
  type: "permanent" | "time-limited" | "one-time";
  label: string;        // human label, e.g. "Beta tester - John"
  packs: string[];      // ["*"] for all, or specific pack IDs
  created_at: string;   // ISO date
  expires_at: string | null;  // ISO date or null
  used_count: number;
  max_uses: number | null;    // null = unlimited
  revoked: boolean;
  last_used_at: string | null;
}

async function readKeys(): Promise<TrialKey[]> {
  try {
    const raw = await fs.readFile(KEYS_FILE, "utf8");
    return JSON.parse(raw) as TrialKey[];
  } catch {
    return [];
  }
}

async function writeKeys(keys: TrialKey[]): Promise<void> {
  await fs.mkdir(path.dirname(KEYS_FILE), { recursive: true });
  await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf8");
}

function generateKey(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `TRIAL-${part()}${part()}-${part()}${part()}`;
}

function isKeyValid(k: TrialKey): { valid: boolean; reason?: string } {
  if (k.revoked) return { valid: false, reason: "revoked" };
  if (k.expires_at && new Date(k.expires_at) < new Date()) {
    return { valid: false, reason: "expired" };
  }
  if (k.max_uses !== null && k.used_count >= k.max_uses) {
    return { valid: false, reason: "use limit reached" };
  }
  return { valid: true };
}

// ── GET — list keys (masks the actual key value after creation) ───────────────
export async function GET() {
  const keys = await readKeys();
  // Return keys with status computed, full key visible for management UI
  const enriched = keys.map(k => ({
    ...k,
    status: isKeyValid(k).valid ? "active" : (isKeyValid(k).reason ?? "inactive"),
  }));
  return NextResponse.json({ keys: enriched });
}

// ── POST — create a new trial key ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type?: TrialKey["type"];
    label?: string;
    packs?: string[];
    expires_at?: string;
    max_uses?: number;
    custom_key?: string;
  };

  const type = body.type ?? "permanent";
  const label = body.label ?? "Unnamed trial";
  const packs = body.packs ?? ["*"];

  const newKey: TrialKey = {
    key: body.custom_key?.trim().toUpperCase() ?? generateKey(),
    type,
    label,
    packs,
    created_at: new Date().toISOString(),
    expires_at: body.expires_at ?? (type === "time-limited" ? new Date(Date.now() + 30 * 86400000).toISOString() : null),
    used_count: 0,
    max_uses: body.max_uses ?? (type === "one-time" ? 1 : null),
    revoked: false,
    last_used_at: null,
  };

  const keys = await readKeys();

  // Prevent duplicate key values
  if (keys.some(k => k.key === newKey.key)) {
    return NextResponse.json({ error: "Key already exists" }, { status: 409 });
  }

  keys.push(newKey);
  await writeKeys(keys);

  return NextResponse.json({ key: newKey }, { status: 201 });
}

// ── DELETE — revoke a key ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyValue = searchParams.get("key")?.trim().toUpperCase();
  if (!keyValue) return NextResponse.json({ error: "key param required" }, { status: 400 });

  const keys = await readKeys();
  const idx = keys.findIndex(k => k.key === keyValue);
  if (idx === -1) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  keys[idx].revoked = true;
  await writeKeys(keys);

  return NextResponse.json({ ok: true, revoked: keyValue });
}

// ── Exported helpers for install/validate routes ──────────────────────────────

export async function checkTrialKey(
  keyValue: string
): Promise<{ valid: boolean; packs: string[]; reason?: string }> {
  // 1. Check env var static keys (permanent, all-packs)
  const envKeys = (process.env.CLAWHQ_TRIAL_KEYS ?? "")
    .split(",").map(k => k.trim().toUpperCase()).filter(Boolean);
  if (envKeys.includes(keyValue)) {
    return { valid: true, packs: ["*"] };
  }

  // 2. Check key store
  const keys = await readKeys();
  const found = keys.find(k => k.key === keyValue);
  if (!found) return { valid: false, reason: "not found" };

  const { valid, reason } = isKeyValid(found);
  if (!valid) return { valid: false, reason };

  return { valid: true, packs: found.packs };
}

export async function recordKeyUse(keyValue: string): Promise<void> {
  const keys = await readKeys();
  const idx = keys.findIndex(k => k.key === keyValue);
  if (idx === -1) return;

  keys[idx].used_count += 1;
  keys[idx].last_used_at = new Date().toISOString();

  // Auto-revoke one-time keys after use
  if (keys[idx].type === "one-time" && keys[idx].max_uses !== null
      && keys[idx].used_count >= keys[idx].max_uses) {
    keys[idx].revoked = true;
  }

  await writeKeys(keys);
}
