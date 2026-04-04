"use client";

import { useEffect, useState } from "react";
import { Bot, Zap, Activity, Clock } from "lucide-react";

interface MetricsData {
  openfang_agents_active?: number;
  openfang_agents_total?: number;
  openfang_uptime_seconds?: number;
  openfang_tokens_total?: Record<string, number>;
  openfang_panics_total?: number;
  openfang_restarts_total?: number;
  error?: string;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function totalTokens(tokensMap?: Record<string, number>): number {
  if (!tokensMap) return 0;
  return Object.values(tokensMap).reduce((sum, v) => sum + v, 0);
}

export function MetricCards() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/metrics").then(r => r.json()).then(setMetrics).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeAgents = metrics?.openfang_agents_active ?? 0;
  const totalAgents = metrics?.openfang_agents_total ?? 0;
  const uptime = metrics?.openfang_uptime_seconds ?? 0;
  const tokens = totalTokens(metrics?.openfang_tokens_total as Record<string, number> | undefined);
  const panics = metrics?.openfang_panics_total ?? 0;

  const cards = [
    {
      label: "Active Agents",
      value: loading ? "—" : String(activeAgents),
      sub: loading ? "loading..." : `of ${totalAgents} total`,
      icon: Bot,
      color: "var(--color-primary)",
      bg: "var(--color-primary-dim)",
      badge: totalAgents > 0 ? `${Math.round((activeAgents / totalAgents) * 100)}% active` : "—",
    },
    {
      label: "Tokens (1h)",
      value: loading ? "—" : tokens > 1000 ? `${(tokens / 1000).toFixed(0)}K` : String(tokens),
      sub: "rolling hourly window",
      icon: Zap,
      color: "var(--color-secondary)",
      bg: "var(--color-secondary-dim)",
      badge: "live",
    },
    {
      label: "System Health",
      value: loading ? "—" : panics === 0 ? "Healthy" : `${panics} panics`,
      sub: "panics + restarts",
      icon: Activity,
      color: panics === 0 ? "var(--color-secondary)" : "var(--color-error)",
      bg: panics === 0 ? "var(--color-secondary-dim)" : "color-mix(in srgb, var(--color-error) 12%, transparent)",
      badge: `${metrics?.openfang_restarts_total ?? 0} restarts`,
    },
    {
      label: "Uptime",
      value: loading ? "—" : formatUptime(uptime),
      sub: "OpenFang daemon",
      icon: Clock,
      color: "var(--color-accent)",
      bg: "var(--color-accent-dim)",
      badge: "v0.5.1",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card card-hover p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
              <c.icon size={16} style={{ color: c.color }} />
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
              {c.badge}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
            {c.value}
          </p>
          <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-text)" }}>{c.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
