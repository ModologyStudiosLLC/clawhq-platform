import { NextResponse } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

export async function GET() {
  try {
    const res = await fetch(`${OPENFANG}/api/hands`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e), hands: [] }, { status: 503 });
  }
}
