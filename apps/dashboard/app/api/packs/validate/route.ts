import { NextResponse } from "next/server";

const REGISTRY_URL = process.env.PACK_REGISTRY_URL ?? "https://packs.clawhqplatform.com";

function getTrialKeys(): Set<string> {
  const raw = process.env.CLAWHQ_TRIAL_KEYS ?? "";
  return new Set(raw.split(",").map(k => k.trim().toUpperCase()).filter(Boolean));
}

export async function POST(request: Request) {
  const { key } = await request.json() as { key?: string };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const normalizedKey = key.trim().toUpperCase();

  // Trial keys are always valid — skip registry
  if (getTrialKeys().has(normalizedKey)) {
    return NextResponse.json({ valid: true, plan: "trial", packs: "all" });
  }

  const res = await fetch(`${REGISTRY_URL}/validate?key=${encodeURIComponent(normalizedKey)}`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
