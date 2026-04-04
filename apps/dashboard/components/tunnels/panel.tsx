"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, Copy, Check, Network, Globe, AlertTriangle, CheckCircle } from "lucide-react";

interface TunnelStatus {
  tailscale: { active: boolean; ip?: string; hostname?: string };
  cloudflared: { active: boolean; tunnelId?: string };
  tailscaleConfigured: boolean;
  cloudflaredConfigured: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
      style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
      <pre className="text-xs font-mono px-4 py-3 overflow-x-auto" style={{ color: "var(--color-text-muted)" }}>
        <code>{children}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

function TunnelCard({
  name, icon: Icon, active, configured, ip, hostname, setupSteps, profileFlag, envVar,
}: {
  name: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  active: boolean;
  configured: boolean;
  ip?: string;
  hostname?: string;
  setupSteps: React.ReactNode;
  profileFlag: string;
  envVar: string;
}) {
  return (
    <div className="card" style={{ padding: "1.5rem", border: `1px solid ${active ? "color-mix(in srgb, var(--color-secondary) 30%, transparent)" : "var(--color-border)"}` }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: active ? "var(--color-secondary-dim)" : "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <Icon size={18} style={{ color: active ? "var(--color-secondary)" : "var(--color-text-muted)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{name}</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Profile: <code className="font-mono">{profileFlag}</code>
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: active ? "var(--color-secondary-dim)" : configured ? "var(--color-primary-dim)" : "var(--color-surface-2)",
            color: active ? "var(--color-secondary)" : configured ? "var(--color-primary)" : "var(--color-text-subtle)",
          }}>
          {active ? "Active" : configured ? "Configured" : "Not set up"}
        </span>
      </div>

      {/* Status details */}
      {active && (ip || hostname) && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
          style={{ background: "var(--color-secondary-dim)", border: "1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent)" }}>
          <CheckCircle size={14} style={{ color: "var(--color-secondary)" }} />
          <div className="flex-1 text-xs font-mono" style={{ color: "var(--color-text)" }}>
            {hostname && <div>{hostname}</div>}
            {ip && <div style={{ color: "var(--color-text-muted)" }}>{ip}</div>}
          </div>
        </div>
      )}

      {!active && (
        <>
          {!configured && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4"
              style={{ background: "rgba(246,217,105,0.1)", border: "1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)" }}>
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-warning)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Set <code className="font-mono" style={{ color: "var(--color-warning)" }}>{envVar}</code> in your <code className="font-mono">.env</code> file to enable this tunnel.
              </p>
            </div>
          )}

          {/* Setup steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>
              Setup
            </p>
            {setupSteps}
          </div>
        </>
      )}
    </div>
  );
}

export function TunnelsPanel() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/tunnels");
      setStatus(await res.json());
    } catch { /* graceful */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Expose your ClawHQ stack privately via Tailscale, or publicly via a Cloudflare Tunnel — no open ports needed.
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : (
        <>
          <TunnelCard
            name="Tailscale VPN"
            icon={Network}
            active={status?.tailscale.active ?? false}
            configured={status?.tailscaleConfigured ?? false}
            ip={status?.tailscale.ip}
            hostname={status?.tailscale.hostname}
            profileFlag="tunnel-ts"
            envVar="TAILSCALE_AUTHKEY"
            setupSteps={
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  1. Get an auth key from{" "}
                  <a href="https://login.tailscale.com/admin/settings/keys" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{ color: "var(--color-primary)" }}>
                    Tailscale Admin <ExternalLink size={10} />
                  </a>
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  2. Add to your <code className="font-mono">.env</code>:
                </p>
                <CodeBlock>TAILSCALE_AUTHKEY=tskey-auth-...</CodeBlock>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  3. Start the Tailscale sidecar:
                </p>
                <CodeBlock>docker compose --profile tunnel-ts up -d</CodeBlock>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  4. Verify the machine appears in your tailnet, then access ClawHQ via its Tailscale IP or MagicDNS hostname.
                </p>
              </div>
            }
          />

          <TunnelCard
            name="Cloudflare Tunnel"
            icon={Globe}
            active={status?.cloudflared.active ?? false}
            configured={status?.cloudflaredConfigured ?? false}
            profileFlag="tunnel-cf"
            envVar="CLOUDFLARE_TUNNEL_TOKEN"
            setupSteps={
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  1. Go to{" "}
                  <a href="https://one.dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{ color: "var(--color-primary)" }}>
                    Cloudflare Zero Trust <ExternalLink size={10} />
                  </a>
                  {" "}→ Networks → Tunnels → Create tunnel.
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  2. Choose Docker, copy the token, add to <code className="font-mono">.env</code>:
                </p>
                <CodeBlock>CLOUDFLARE_TUNNEL_TOKEN=eyJ...</CodeBlock>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  3. In the Cloudflare dashboard, configure the tunnel public hostname to proxy to:
                </p>
                <CodeBlock>http://dashboard:3500</CodeBlock>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  4. Start the Cloudflare tunnel sidecar:
                </p>
                <CodeBlock>docker compose --profile tunnel-cf up -d</CodeBlock>
              </div>
            }
          />
        </>
      )}

      {/* Comparison note */}
      <div className="card px-5 py-4" style={{ border: "1px solid var(--color-border)" }}>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text)" }}>
          Which tunnel should I use?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--color-primary)" }}>Tailscale</p>
            <ul className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
              <li>Private — only accessible from your tailnet</li>
              <li>Zero latency overhead (WireGuard)</li>
              <li>Best for teams & internal tools</li>
              <li>Requires Tailscale client on every device</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--color-secondary)" }}>Cloudflare Tunnel</p>
            <ul className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
              <li>Public — accessible from any browser</li>
              <li>Free tier available</li>
              <li>Add Cloudflare Access for auth layer</li>
              <li>Best for sharing with clients</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
