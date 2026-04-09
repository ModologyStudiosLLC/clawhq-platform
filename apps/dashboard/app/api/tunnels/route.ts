import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Check whether tunnel sidecars are reachable on the Docker bridge.
// These services only exist when started with --profile tunnel-ts / tunnel-cf.

async function checkTailscale(): Promise<{ active: boolean; ip?: string; hostname?: string }> {
  try {
    // Tailscale uses host network mode — check the Docker proxy container's
    // metadata API or try the Tailscale local API via the dashboard host.
    // In practice, if the TS service is up, /proc/net or the Tailscale status
    // socket would be accessible. We use a light heuristic: check if the
    // tailscale container's hostname resolves on the bridge.
    const res = await fetch("http://tailscale:41112/localapi/v0/status", {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        active: true,
        ip: data.TailscaleIPs?.[0],
        hostname: data.Self?.DNSName?.replace(/\.$/, ""),
      };
    }
    return { active: false };
  } catch {
    return { active: false };
  }
}

async function checkCloudflared(): Promise<{ active: boolean; tunnelId?: string }> {
  try {
    const res = await fetch("http://cloudflared:2000/ready", {
      signal: AbortSignal.timeout(2000),
    });
    return { active: res.ok };
  } catch {
    return { active: false };
  }
}

export async function GET() {
  const [tailscale, cloudflared] = await Promise.all([
    checkTailscale(),
    checkCloudflared(),
  ]);

  return NextResponse.json({
    tailscale,
    cloudflared,
  });
}
