"use client";

import { useEffect, useState } from "react";
import { CreditCard, Users, Zap, ExternalLink, Loader2, ArrowUpRight } from "lucide-react";
import { FEATURES, type LicenseTier } from "@/lib/license";

interface BillingInfo {
  tier: LicenseTier;
  seats: number;
  provisionedAt: string | null;
  stripeCustomerId: string | null;
}

export default function BillingPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const tier: LicenseTier = info?.tier ?? "free";
  const isCloud = tier === "cloud" || tier === "enterprise";

  useEffect(() => {
    fetch("/api/billing/info")
      .then(r => r.ok ? r.json() : null)
      .then(d => setInfo(d))
      .catch(() => setInfo(null));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  }

  async function startTrial() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats: 1 }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setUpgradeLoading(false);
    }
  }

  const agentLimit = FEATURES.agentSeatLimit(tier);
  const memberLimit = FEATURES.memberSeatLimit(tier);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          Billing
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Manage your subscription and plan limits.
        </p>
      </div>

      {/* Current plan */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: isCloud ? "var(--color-primary)" : "var(--color-surface-2)",
                  color: isCloud ? "var(--color-on-brand)" : "var(--color-text-muted)",
                }}
              >
                {tier === "free" ? "Self-hosted" : tier === "cloud" ? "Cloud" : "Enterprise"}
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              {tier === "free"
                ? "Open-source, self-hosted. Your keys, your infra."
                : tier === "cloud"
                ? `${info?.seats ?? 1} seat${(info?.seats ?? 1) !== 1 ? "s" : ""} · $49/seat/month`
                : "Enterprise plan — contact us for terms."}
            </p>
          </div>

          {isCloud ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            >
              {portalLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ExternalLink size={12} />
              )}
              Manage
            </button>
          ) : (
            <button
              onClick={startTrial}
              disabled={upgradeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-primary)", color: "var(--color-on-brand)" }}
            >
              {upgradeLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ArrowUpRight size={12} />
              )}
              Start free trial
            </button>
          )}
        </div>
      </div>

      {/* Limits */}
      <div
        className="rounded-xl border divide-y"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <LimitRow
          icon={<Zap size={14} />}
          label="Agents"
          value={agentLimit === Infinity ? "Unlimited" : `${agentLimit} max`}
        />
        <LimitRow
          icon={<Users size={14} />}
          label="Team members"
          value={memberLimit === Infinity ? "Unlimited" : `${memberLimit} max`}
        />
        <LimitRow
          icon={<CreditCard size={14} />}
          label="Model keys"
          value="Bring your own (BYOK)"
        />
      </div>

      {!isCloud && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            ClawHQ Cloud — $49/seat/month
          </p>
          <ul className="space-y-1.5 mb-4">
            {[
              "Managed on Cloudflare — we handle infra",
              "Up to 20 agents per seat",
              "Team management",
              "Audit log",
              "7-day free trial, no credit card required",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <span style={{ color: "var(--color-secondary)" }}>•</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={startTrial}
            disabled={upgradeLoading}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "var(--color-on-brand)" }}
          >
            {upgradeLoading ? "Redirecting..." : "Start 7-day free trial"}
          </button>
        </div>
      )}
    </div>
  );
}

function LimitRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--color-text-muted)" }}>{icon}</span>
        <span className="text-sm" style={{ color: "var(--color-text)" }}>{label}</span>
      </div>
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{value}</span>
    </div>
  );
}
