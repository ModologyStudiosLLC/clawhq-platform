import { NextRequest, NextResponse } from "next/server";

const OPENFANG = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";

export async function POST(req: NextRequest) {
  const { agentId } = await req.json();
  try {
    const res = await fetch(`${OPENFANG}/api/agents/${agentId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
