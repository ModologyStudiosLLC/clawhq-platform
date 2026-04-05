import { NextRequest, NextResponse } from "next/server";

const HERMES_URL = process.env.HERMES_INTERNAL_URL ?? "http://localhost:4300";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") ?? "status";
  const limit = searchParams.get("limit") ?? "50";

  try {
    const url =
      endpoint === "events"
        ? `${HERMES_URL}/sentinel/events?limit=${limit}`
        : `${HERMES_URL}/sentinel/status`;

    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({ active: false, error: `hermes ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ active: false, error: "hermes_unreachable" }, { status: 503 });
  }
}
