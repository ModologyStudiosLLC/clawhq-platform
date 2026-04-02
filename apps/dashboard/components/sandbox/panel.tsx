"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, Lock, Server, RefreshCw } from "lucide-react";

interface Policy {
  id: string;
  name: string;
  description: string;
  enforced: boolean;
  severity: "high" | "medium" | "low";
  target: string;
}

interface ContainerHardening {
  seccompProfile: string;
  noNewPrivileges: boolean;
  readOnlyRootfs: boolean;
  nonRootUser: boolean;
}

interface SandboxResponse {
  policies: Policy[];
  containerHardening: ContainerHardening;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "var(--color-secondary)",
  medium: "var(--color-primary)",
  low: "var(--color-text-muted)",
};

function PolicyRow({ policy }: { policy: Policy }) {
  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: policy.enforced ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.15)",
        }}
      >
        {policy.enforced
          ? <ShieldCheck size={15} style={{ color: "var(--color-secondary)" }} />
          : <ShieldAlert size={15} style={{ color: "var(--color-error)" }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {policy.name}
          </p>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
          >
            {policy.target}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {policy.description}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: SEVERITY_COLOR[policy.severity] }}
        >
          {policy.severity}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: policy.enforced ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.15)",
            color: policy.enforced ? "var(--color-secondary)" : "var(--color-error)",
          }}
        >
          {policy.enforced ? "Enforced" : "Off"}
        </span>
      </div>
    </div>
  );
}

function HardeningBadge({ label, value }: { label: string; value: boolean | string }) {
  const on = value === true || (typeof value === "string" && value.length > 0);
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
      style={{ background: "var(--color-surface-2)" }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{label}</span>
      <span
        className="text-xs font-semibold"
        style={{ color: on ? "var(--color-secondary)" : "var(--color-text-subtle)" }}
      >
        {typeof value === "boolean" ? (value ? "✓ Enabled" : "✗ Disabled") : value}
      </span>
    </div>
  );
}

export function SandboxPanel() {
  const [data, setData] = useState<SandboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/sandbox");
      setData(await res.json());
    } catch { /* graceful */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const enforced = data?.policies.filter(p => p.enforced).length ?? 0;
  const total = data?.policies.length ?? 0;
  const score = total > 0 ? Math.round((enforced / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Score card */}
      <div
        className="card px-5 py-5 flex items-center gap-5"
        style={{ border: "1px solid rgba(105,246,184,0.25)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-secondary-dim)", border: "1px solid rgba(105,246,184,0.3)" }}
        >
          <Shield size={28} style={{ color: "var(--color-secondary)" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              {loading ? "—" : `${score}%`}
            </span>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              security score
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {loading ? "Loading policies…" : `${enforced} of ${total} policies enforced`}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-50"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Container hardening */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-4">
          <Server size={15} style={{ color: "var(--color-text-muted)" }} />
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}
          >
            Container Hardening (OpenFang)
          </h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : data && (
          <div className="space-y-2">
            <HardeningBadge label="Seccomp Profile" value={data.containerHardening.seccompProfile} />
            <HardeningBadge label="No New Privileges" value={data.containerHardening.noNewPrivileges} />
            <HardeningBadge label="Read-Only Rootfs" value={data.containerHardening.readOnlyRootfs} />
            <HardeningBadge label="Non-Root User" value={data.containerHardening.nonRootUser} />
          </div>
        )}
      </div>

      {/* Policy table */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-2">
          <Lock size={15} style={{ color: "var(--color-text-muted)" }} />
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}
          >
            Security Policies
          </h2>
        </div>
        {loading ? (
          <div className="space-y-4 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : data?.policies.map(p => (
          <PolicyRow key={p.id} policy={p} />
        ))}
      </div>

      {/* Note */}
      <div
        className="card px-5 py-4"
        style={{ border: "1px solid rgba(246,217,105,0.2)" }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-warning)" }}>
          Note — Changes require a redeploy
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Sandbox policies are enforced at the Docker Compose layer. Modifying them requires updating
          <code className="font-mono mx-1">docker-compose.yml</code> and running
          <code className="font-mono mx-1">docker compose up -d --force-recreate openfang</code>.
          The Security Level in Settings controls agent-level permissions only (which tools they can call).
        </p>
      </div>
    </div>
  );
}
