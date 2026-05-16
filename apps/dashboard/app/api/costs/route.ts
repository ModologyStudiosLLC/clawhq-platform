import { NextRequest, NextResponse } from "next/server";

const PAPERCLIP =
  process.env.PAPERCLIP_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_PAPERCLIP_URL ||
  "http://localhost:3100";

async function getCompanyId(): Promise<string | null> {
  try {
    const res = await fetch(`${PAPERCLIP}/api/companies`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const company = Array.isArray(data) ? data[0] : data;
    return company?.id ?? null;
  } catch {
    return null;
  }
}

// GET /api/costs?endpoint=trend&days=30
// GET /api/costs?endpoint=by-agent&from=...&to=...
// GET /api/costs?endpoint=summary
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") ?? "trend";

  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "No company found" }, { status: 503 });
  }

  const params = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== "endpoint") params.set(k, v);
  }
  const qs = params.toString();
  const url = `${PAPERCLIP}/api/companies/${companyId}/costs/${endpoint}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
