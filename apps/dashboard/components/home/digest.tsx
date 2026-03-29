"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Zap } from "lucide-react";
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

export function HomeDigest() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/metrics").then(r => r.json()).catch(() => ({})),
    ]).then(([a, m]) => {
      setAgents(Array.isArray(a) ? a : []);
      setMetrics(m);
      setLoading(false);
    });
  }, []);

  const activeAgents = agents.filter(a => a.state === "Running");
  const needsAttention = agents.filter(a => a.state === "Crashed" || a.state === "Stopped");
  const totalTokens = Object.values((metrics?.openfang_tokens_total || {}) as Record<string, number>).reduce((s, v) => s + v, 0);

  const recentAgents = [...agents]
    .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>
          {greeting()}, Felix
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {loading ? "Loading your team..." : `${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""} active right now`}
        </p>
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

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Active agents",
            value: loading ? "—" : String(activeAgents.length),
            sub: `of ${agents.length} total`,
            color: "var(--color-secondary)",
            bg: "var(--color-secondary-dim)",
            icon: CheckCircle2,
            href: "/team",
          },
          {
            label: "Tokens used today",
            value: loading ? "—" : totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : String(totalTokens),
            sub: "rolling window",
            color: "var(--color-primary)",
            bg: "var(--color-primary-dim)",
            icon: Zap,
            href: "/budget",
          },
          {
            label: "Capabilities on",
            value: "4",
            sub: "of 8 available",
            color: "var(--color-accent)",
            bg: "var(--color-accent-dim)",
            icon: Zap,
            href: "/capabilities",
          },
        ].map(card => (
          <Link key={card.label} href={card.href} className="card card-hover p-5 block">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <card.icon size={15} style={{ color: card.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>{card.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text)" }}>{card.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Your team snapshot */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Your team</h2>
          <Link href="/team" className="text-xs flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-11 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))
          ) : recentAgents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: "var(--color-surface-2)" }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: agent.state === "Running" ? "var(--color-secondary)" : "var(--color-error, #ff6b6b)" }}
              />
              <span className="text-sm font-medium flex-1" style={{ color: "var(--color-text)" }}>{agent.name}</span>
              <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{timeAgo(agent.last_active)}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: agent.state === "Running" ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.12)",
                  color: agent.state === "Running" ? "var(--color-secondary)" : "var(--color-error, #ff6b6b)",
                }}
              >
                {agent.state === "Running" ? "Active" : "Needs attention"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/team" className="card card-hover p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-dim)" }}>
            <span style={{ fontSize: "18px" }}>🤖</span>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Talk to an agent</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Get something done now</p>
          </div>
          <ArrowRight size={14} className="ml-auto flex-shrink-0" style={{ color: "var(--color-text-subtle)" }} />
        </Link>
        <Link href="/capabilities" className="card card-hover p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-accent-dim)" }}>
            <span style={{ fontSize: "18px" }}>⚡</span>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Add a capability</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Research, leads, content</p>
          </div>
          <ArrowRight size={14} className="ml-auto flex-shrink-0" style={{ color: "var(--color-text-subtle)" }} />
        </Link>
      </div>
    </div>
  );
}
