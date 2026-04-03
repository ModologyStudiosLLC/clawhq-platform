import { NextResponse } from "next/server";

const REGISTRY_URL = process.env.PACK_REGISTRY_URL ?? "https://packs.clawhqplatform.com";

export async function POST(request: Request) {
  const { key } = await request.json() as { key?: string };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const res = await fetch(`${REGISTRY_URL}/validate?key=${encodeURIComponent(key.toUpperCase())}`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
