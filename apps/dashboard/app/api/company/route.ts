import { NextResponse } from "next/server";

const PAPERCLIP = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || "http://localhost:3100";

export async function GET() {
  try {
    const res = await fetch(`${PAPERCLIP}/api/companies`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
