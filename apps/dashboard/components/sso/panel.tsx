"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Key, Users, Copy, Check } from "lucide-react";

interface Connection {
  id: string;
  name: string;
  state: string;
  type: string;
  domains: string[];
}

interface Directory {
  id: string;
  name: string;
  state: string;
  type: string;
}

interface SSOStatus {
  configured: boolean;
  sso: { enabled: boolean; connections: Connection[] };
  directory: { enabled: boolean; directories: Directory[] };
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
    </button>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
      {active
        ? <CheckCircle size={15} style={{ color: "var(--color-secondary)", flexShrink: 0 }} />
        : <XCircle size={15} style={{ color: "var(--color-text-subtle)", flexShrink: 0 }} />
      }
      <span className="text-sm flex-1" style={{ color: active ? "var(--color-text)" : "var(--color-text-muted)" }}>{label}</span>
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          background: active ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
          color: active ? "var(--color-secondary)" : "var(--color-text-subtle)",
        }}
      >
        {active ? "Active" : "Not configured"}
      </span>
    </div>
  );
}

function ConnectionCard({ conn }: { conn: Connection }) {
  const active = conn.state === "active";
  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: "var(--color-surface-2)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: active ? "var(--color-secondary)" : "var(--color-warning)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{conn.name}</span>
        <span className="text-xs ml-1" style={{ color: "var(--color-text-muted)" }}>{conn.type}</span>
      </div>
      {conn.domains.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {conn.domains.map(d => (
            <span key={d} className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid rgba(105,218,255,0.3)" }}>
        {n}
      </div>
      <div className="flex-1 pb-5">
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>{title}</p>
        <div className="text-xs space-y-1.5" style={{ color: "var(--color-text-muted)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SSOPanel() {
  const [status, setStatus] = useState<SSOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/sso/status");
      setStatus(await res.json());
    } catch { /* graceful */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "/auth/callback";

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Enterprise SSO and directory sync are powered by WorkOS. Configure connections in the WorkOS dashboard.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-50"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <a href="https://dashboard.workos.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
            style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid rgba(105,218,255,0.25)" }}>
            WorkOS Dashboard <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Status overview */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-4">
          <Key size={15} style={{ color: "var(--color-text-muted)" }} />
          <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
            Status
          </h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : (
          <>
            <StatusRow label="WorkOS API configured" active={status?.configured ?? false} />
            <StatusRow label="SAML/OIDC SSO connection active" active={status?.sso.enabled ?? false} />
            <StatusRow label="Directory sync (SCIM) active" active={status?.directory.enabled ?? false} />
          </>
        )}
      </div>

      {/* Active connections */}
      {status?.configured && (status.sso.connections.length > 0 || status.directory.directories.length > 0) && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
            Connections
          </h2>
          {status.sso.connections.length > 0 && (
            <>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>SSO</p>
              <div className="space-y-2 mb-4">
                {status.sso.connections.map(c => <ConnectionCard key={c.id} conn={c} />)}
              </div>
            </>
          )}
          {status.directory.directories.length > 0 && (
            <>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>Directory Sync</p>
              <div className="space-y-2">
                {status.directory.directories.map(d => (
                  <div key={d.id} className="px-4 py-3 rounded-lg flex items-center gap-3"
                    style={{ background: "var(--color-surface-2)" }}>
                    <Users size={14} style={{ color: "var(--color-text-muted)" }} />
                    <span className="text-sm flex-1" style={{ color: "var(--color-text)" }}>{d.name}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{d.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: d.state === "linked" ? "var(--color-secondary-dim)" : "var(--color-surface)",
                        color: d.state === "linked" ? "var(--color-secondary)" : "var(--color-text-subtle)",
                      }}>
                      {d.state}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Setup guide */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-5"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Setup Guide
        </h2>

        <SetupStep n={1} title="Configure WorkOS application">
          <p>Go to <a href="https://dashboard.workos.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
            WorkOS Dashboard <ExternalLink size={10} />
          </a> → Applications → your app.</p>
          <p>Set the callback URI to:</p>
          <div className="flex items-center gap-2 mt-1 px-2.5 py-2 rounded font-mono"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
            <span className="flex-1 text-xs">{callbackUrl}</span>
            <CopyButton text={callbackUrl} />
          </div>
        </SetupStep>

        <SetupStep n={2} title="Add WorkOS env vars to .env">
          <div className="px-2.5 py-2 rounded font-mono mt-1"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
            <div className="text-xs">WORKOS_API_KEY=sk_live_...</div>
            <div className="text-xs">WORKOS_CLIENT_ID=client_...</div>
          </div>
          <p className="mt-1.5">Restart the dashboard container after updating.</p>
        </SetupStep>

        <SetupStep n={3} title="Create an SSO connection (SAML or OIDC)">
          <p>In WorkOS: Organizations → select your org → Single Sign-On → Add Connection.</p>
          <p>Supported providers: Okta, Microsoft Entra (Azure AD), Google Workspace, OneLogin, SAML 2.0 generic.</p>
          <p>Copy the SP Entity ID and ACS URL from WorkOS into your IdP, then activate the connection.</p>
        </SetupStep>

        <SetupStep n={4} title="Enable directory sync (optional)">
          <p>In WorkOS: Organizations → your org → Directory Sync → Link directory.</p>
          <p>Supported: Okta, Microsoft Entra, Google Workspace, SCIM 2.0 generic.</p>
          <p>Users and groups sync automatically — provisioned users can SSO into ClawHQ immediately.</p>
        </SetupStep>
      </div>
    </div>
  );
}
