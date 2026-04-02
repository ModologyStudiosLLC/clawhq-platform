"use client";

import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "railway",
    name: "Railway",
    logo: "🚂",
    tagline: "One-click deploy. Zero config.",
    desc: "Railway auto-detects your Docker Compose and deploys all services with persistent storage. Free tier available — no credit card required to start.",
    badge: "Recommended",
    badgeColor: "var(--color-secondary)",
    badgeDim: "var(--color-secondary-dim)",
    cta: "Deploy to Railway",
    href: "https://railway.app/new/template?template=https://github.com/modologystudios/clawhq",
    color: "#B846F4",
    dim: "rgba(184,70,244,0.10)",
    border: "rgba(184,70,244,0.25)",
    features: ["Auto SSL", "Persistent volumes", "Built-in logs", "GitHub sync"],
  },
  {
    id: "render",
    name: "Render",
    logo: "⬡",
    tagline: "Deploy from your repo in seconds.",
    desc: "Render uses your render.yaml for the full stack. Free static hosting, background workers, and managed PostgreSQL.",
    badge: null,
    badgeColor: "",
    badgeDim: "",
    cta: "Deploy to Render",
    href: "https://render.com/deploy?repo=https://github.com/modologystudios/clawhq",
    color: "#46E3B7",
    dim: "rgba(70,227,183,0.08)",
    border: "rgba(70,227,183,0.20)",
    features: ["Free tier", "Preview deploys", "Auto scaling", "Cron jobs"],
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    logo: "🌊",
    tagline: "App Platform with full Docker support.",
    desc: "DigitalOcean App Platform deploys your entire ClawHQ stack with managed databases and built-in CDN. Predictable pricing.",
    badge: null,
    badgeColor: "",
    badgeDim: "",
    cta: "Deploy to DigitalOcean",
    href: "https://cloud.digitalocean.com/apps/new?repo=github.com/modologystudios/clawhq/tree/main",
    color: "#0080FF",
    dim: "rgba(0,128,255,0.08)",
    border: "rgba(0,128,255,0.20)",
    features: ["Managed DB", "CDN included", "$200 free credit", "Global regions"],
  },
];

// ── Copy Docker command ───────────────────────────────────────────────────────

const DOCKER_CMD = "curl -fsSL https://raw.githubusercontent.com/modologystudios/clawhq/main/install.sh | bash";

function CopyCommand({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-muted)",
      }}
    >
      <span className="flex-1 truncate">{text}</span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md flex-shrink-0 transition-all"
        style={{
          background: copied ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
          color: copied ? "var(--color-secondary)" : "var(--color-text-muted)",
          border: `1px solid ${copied ? "var(--color-secondary)" : "var(--color-border)"}`,
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function DeployPanel() {
  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-subtle)" }}>
          One-click deployment
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          ClawHQ is fully open-source and self-hosted. Pick your platform and deploy the full stack in minutes.
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-4">
        {PLATFORMS.map(p => (
          <div
            key={p.id}
            className="card p-6 transition-all card-hover"
            style={{ borderColor: p.border, background: `linear-gradient(135deg, ${p.dim} 0%, var(--color-surface) 50%)` }}
          >
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: p.dim, border: `1px solid ${p.border}` }}
              >
                {p.logo}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3
                    className="font-bold text-base"
                    style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                  >
                    {p.name}
                  </h3>
                  {p.badge && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: p.badgeDim, color: p.badgeColor }}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium mb-2" style={{ color: p.color }}>{p.tagline}</p>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>{p.desc}</p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.features.map(f => (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${p.dim}, rgba(0,0,0,0))`,
                    border: `1px solid ${p.border}`,
                    color: p.color,
                  }}
                >
                  {p.cta}
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Docker / self-host section */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            🐳
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-base mb-0.5"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Self-host with Docker
            </h3>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
              Any Linux machine, VPS, or home server with Docker installed
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              Run the one-liner below. The install script clones the repo, generates env files,
              and starts the full stack. Works on any machine running Docker.
            </p>
            <CopyCommand text={DOCKER_CMD} />
            <p className="text-xs mt-2" style={{ color: "var(--color-text-subtle)" }}>
              Requires Docker &amp; Docker Compose v2.
            </p>
          </div>
        </div>
      </div>

      {/* Env variables reminder */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: "var(--color-primary-dim)", border: "1px solid rgba(105,218,255,0.2)" }}
      >
        <span className="text-lg flex-shrink-0">💡</span>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          After deploying, set your <strong style={{ color: "var(--color-primary)" }}>WORKOS_API_KEY</strong>,{" "}
          <strong style={{ color: "var(--color-primary)" }}>WORKOS_CLIENT_ID</strong>, and{" "}
          <strong style={{ color: "var(--color-primary)" }}>WORKOS_COOKIE_PASSWORD</strong> environment variables.
          See <code className="font-mono">.env.example</code> in the repo for the full list.
        </p>
      </div>
    </div>
  );
}
