import { NextResponse } from "next/server";
import { checkTrialKey } from "../trial-keys/route";

const REGISTRY_URL = process.env.PACK_REGISTRY_URL ?? "https://packs.clawhqplatform.com";

export async function POST(request: Request) {
  const { key } = await request.json() as { key?: string };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const normalizedKey = key.trim().toUpperCase();

  // Check trial key store (includes env var keys)
  const trial = await checkTrialKey(normalizedKey);
  if (trial.valid) {
    return NextResponse.json({
      valid: true,
      plan: "trial",
      packs: trial.packs.includes("*") ? "all" : trial.packs,
    });
  }
  if (trial.reason && trial.reason !== "not found") {
    // Key exists but is expired/revoked/exhausted — tell the user why
    return NextResponse.json({ valid: false, reason: trial.reason });
  }

  // Standard registry check
  const res = await fetch(`${REGISTRY_URL}/validate?key=${encodeURIComponent(normalizedKey)}`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
