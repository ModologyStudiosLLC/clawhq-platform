"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Zap, WifiOff } from "lucide-react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_provider: string;
  last_active: string;
}

interface MetricsData {
  openfang_agents_active?: number;
  openfang_agents_total?: number;
  openfang_tokens_total?: Record<string, number>;
  openfang_panics_total?: number;
}

interface Hand {
  id: string;
  active: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PROVIDER_BADGES: { label: string; color: string; dot: string }[] = [
  { label: "Anthropic", color: "rgba(172,138,255,0.15)", dot: "#ac8aff" },
  { label: "OpenAI", color: "rgba(105,246,184,0.15)", dot: "#69f6b8" },
  { label: "Groq", color: "rgba(105,218,255,0.15)", dot: "#69daff" },
  { label: "OpenRouter", color: "rgba(246,217,105,0.15)", dot: "#f6d969" },
];

function providerFromAgents(agents: Agent[]): string[] {
  const providers = new Set(agents.map(a => a.model_provider).filter(Boolean));
  return Array.from(providers);
}

function normalizeBadge(provider: string): { label: string; color: string; dot: string } {
  const lower = provider.toLowerCase();
  const found = PROVIDER_BADGES.find(b => lower.includes(b.label.toLowerCase()));
  return found ?? { label: provider, color: "rgba(240,240,245,0.08)", dot: "rgba(240,240,245,0.4)" };
}

export function HomeDigest() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [hands, setHands] = useState<Hand[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/agents").then(r => { if (!r.ok) throw new Error("agents"); return r.json(); }).catch(() => null),
      fetch("/api/metrics").then(r => { if (!r.ok) throw new Error("metrics"); return r.json(); }).catch(() => null),
      fetch("/api/hands").then(r => { if (!r.ok) throw new Error("hands"); return r.json(); }).catch(() => null),
    ]).then(([a, m, h]) => {
      if (cancelled) return;
      const isOffline = a === null && m === null && h === null;
      setOffline(isOffline);
      setAgents(Array.isArray(a) ? a : []);
      setMetrics(m ?? {});
      setHands(Array.isArray(h) ? h : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const activeAgents = agents.filter(a => a.state === "Running");
  const needsAttention = agents.filter(a => a.state === "Crashed" || a.state === "Stopped");
  const totalTokens = Object.values((metrics?.openfang_tokens_total || {}) as Record<string, number>).reduce((s, v) => s + v, 0);

  const recentAgents = [...agents]
    .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
    .slice(0, 4);

  // Determine provider badges: prefer live data, fall back to static list
  const liveProviders = providerFromAgents(agents);
  const providerBadges = liveProviders.length > 0
    ? liveProviders.map(normalizeBadge)
    : PROVIDER_BADGES;

  const tokenDisplay = loading
    ? "—"
    : totalTokens > 1000000
    ? `${(totalTokens / 1000000).toFixed(1)}M`
    : totalTokens > 1000
    ? `${(totalTokens / 1000).toFixed(0)}K`
    : String(totalTokens);

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">

      {/* Hero section */}
      <div className="relative pt-4 pb-2">
        {/* Ambient orb behind headline */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-24px",
            left: "-40px",
            width: "320px",
            height: "220px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(105,218,255,0.12) 0%, transparent 70%)",
            filter: "blur(32px)",
            pointerEvents: "none",
            animation: "var(--animate-float)",
          }}
        />
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}
        >
          {greeting()}, Mike
        </p>
        <h1
          className="gradient-text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "0.75rem",
          }}
        >
          Your AI team.{"\n"}
          <span style={{ display: "block" }}>Fully coordinated.</span>
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-muted)", maxWidth: "480px" }}>
          Command every agent, channel, and capability from one place.
        </p>
      </div>

      {/* Service offline banner */}
      {!loading && offline && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: "rgba(246,217,105,0.08)", border: "1px solid rgba(246,217,105,0.2)" }}
        >
          <WifiOff size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--color-warning)" }}>
              Service Offline
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Unable to reach the OpenClaw backend. Check your connection or service configuration.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); setOffline(false); window.location.reload(); }}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{
              background: "rgba(246,217,105,0.12)",
              color: "var(--color-warning)",
              border: "1px solid rgba(246,217,105,0.25)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Live system status bar */}
      <div
        className="flex items-center gap-6 px-5 py-3 rounded-xl"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          overflowX: "auto",
        }}
      >
        {/* Pulsing live dot */}
        <span className="flex items-center gap-2 flex-shrink-0">
          <span
            className="status-dot active"
            style={{ animation: "var(--animate-pulse-slow)" }}
          />
          <span style={{ color: "var(--color-secondary)", fontWeight: 600 }}>LIVE</span>
        </span>
        <span
          style={{ width: "1px", height: "16px", background: "var(--color-border-strong)", flexShrink: 0 }}
        />
        <span className="flex items-center gap-1.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>agents</span>
          <span style={{ color: "var(--color-secondary)", fontWeight: 700 }}>
            {loading ? "—" : `${activeAgents.length}/${agents.length}`}
          </span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>tokens</span>
          <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{tokenDisplay}</span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>uptime</span>
          <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>99.9%</span>
        </span>
        {/* Provider badges */}
        <span
          style={{ width: "1px", height: "16px", background: "var(--color-border-strong)", flexShrink: 0 }}
        />
        <span className="flex items-center gap-2 flex-wrap">
          {providerBadges.map(badge => (
            <span
              key={badge.label}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: badge.color,
                border: `1px solid ${badge.dot}33`,
                color: "var(--color-text-muted)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: badge.dot,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              {badge.label}
            </span>
          ))}
        </span>
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-error, #ff6b6b)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-error, #ff6b6b)" }}>
              {needsAttention.length} agent{needsAttention.length > 1 ? "s need" : " needs"} attention
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {needsAttention.map(a => a.name).join(", ")}
            </p>
          </div>
          <Link href="/team" className="ml-auto text-xs flex items-center gap-1 flex-shrink-0" style={{ color: "var(--color-error, #ff6b6b)" }}>
            View <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Active agents",
            value: loading ? "—" : String(activeAgents.length),
            sub: loading ? "" : `of ${agents.length} total`,
            color: "var(--color-secondary)",
            bg: "var(--color-secondary-dim)",
            gradientFrom: "rgba(105,246,184,0.08)",
            gradientTo: "transparent",
            icon: CheckCircle2,
            href: "/team",
          },
          {
            label: "Tokens used",
            value: tokenDisplay,
            sub: "rolling window",
            color: "var(--color-primary)",
            bg: "var(--color-primary-dim)",
            gradientFrom: "rgba(105,218,255,0.08)",
            gradientTo: "transparent",
            icon: Zap,
            href: "/budget",
          },
          {
            label: "Capabilities on",
            value: loading ? "—" : String(hands.filter(h => h.active).length),
            sub: loading ? "" : `of ${hands.length} available`,
            color: "var(--color-accent)",
            bg: "var(--color-accent-dim)",
            gradientFrom: "rgba(172,138,255,0.08)",
            gradientTo: "transparent",
            icon: Zap,
            href: "/capabilities",
          },
        ].map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="card card-hover card-glow-primary block"
            style={{
              padding: "1.5rem",
              background: `linear-gradient(135deg, ${card.gradientFrom} 0%, ${card.gradientTo} 100%), var(--color-surface)`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: card.bg }}
            >
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <p
              className="font-bold"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                lineHeight: 1,
                color: card.color,
                letterSpacing: "-0.03em",
              }}
            >
              {card.value}
            </p>
            <p
              className="text-sm font-semibold mt-1.5"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              {card.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Talk to an agent — featured CTA */}
      {activeAgents.length > 0 && (
        <Link
          href={`/team/${activeAgents[0].id}`}
          className="block card card-hover"
          style={{
            padding: "1.5rem",
            background: "linear-gradient(135deg, rgba(105,218,255,0.06) 0%, rgba(172,138,255,0.06) 100%), var(--color-surface)",
            borderImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent)) 1",
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "var(--color-primary-dim)" }}
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}
              >
                Featured agent
              </p>
              <p
                className="text-base font-bold truncate"
                style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                {activeAgents[0].name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Active now · {activeAgents[0].model_provider} · Tap to start a conversation
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
              style={{
                background: "var(--color-primary-dim)",
                border: "1px solid var(--color-primary)",
                color: "var(--color-primary)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-display)",
              }}
            >
              Talk now
              <ArrowRight size={13} />
            </div>
          </div>
        </Link>
      )}

      {/* Team snapshot */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="font-bold text-base"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            Your team
          </h2>
          <Link href="/team" className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))
          ) : recentAgents.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl text-center"
              style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-border)" }}
            >
              <span style={{ fontSize: 28 }}>🤖</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No agents yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Add your first agent to get started</p>
              </div>
              <Link
                href="/team"
                className="text-xs px-4 py-2 rounded-lg font-medium"
                style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}
              >
                Add an agent →
              </Link>
            </div>
          ) : recentAgents.map(agent => {
            const isActive = agent.state === "Running";
            return (
              <div
                key={agent.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Live glow dot */}
                <span
                  className={`status-dot flex-shrink-0 ${isActive ? "active" : "error"}`}
                />
                <span
                  className="text-sm font-semibold flex-1"
                  style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
                >
                  {agent.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}
                >
                  {timeAgo(agent.last_active)}
                </span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: isActive ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.12)",
                    color: isActive ? "var(--color-secondary)" : "var(--color-error, #ff6b6b)",
                  }}
                >
                  {isActive ? "Active" : "Needs attention"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions — bento style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/team"
          className="card card-hover card-glow-primary p-5 flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(105,218,255,0.06) 0%, transparent 100%), var(--color-surface)",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-primary-dim)" }}
          >
            <span style={{ fontSize: "22px" }}>🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              Talk to an agent
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Get something done now</p>
          </div>
          <ArrowRight size={15} className="flex-shrink-0" style={{ color: "var(--color-primary)" }} />
        </Link>
        <Link
          href="/capabilities"
          className="card card-hover card-glow-primary p-5 flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(172,138,255,0.06) 0%, transparent 100%), var(--color-surface)",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-accent-dim)" }}
          >
            <span style={{ fontSize: "22px" }}>⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              Add a capability
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Research, leads, content</p>
          </div>
          <ArrowRight size={15} className="flex-shrink-0" style={{ color: "var(--color-accent)" }} />
        </Link>
      </div>

    </div>
  );
}
