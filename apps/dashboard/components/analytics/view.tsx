"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import { TrendingUp, Zap, DollarSign, RefreshCw } from "lucide-react";

interface Snapshot {
  ts: number;
  tokensByAgent: Record<string, number>;
  totalTokens: number;
}

const PROVIDER_COST_PER_1M = 0.30; // blended $0.30/1M tokens

const COLORS = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-accent)",
  "var(--color-warning)",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#60a5fa",
];

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtCost(tokens: number) {
  return `$${((tokens / 1_000_000) * PROVIDER_COST_PER_1M).toFixed(2)}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

type Range = "1d" | "7d" | "30d";

export function AnalyticsView() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapping, setSnapping] = useState(false);
  const [range, setRange] = useState<Range>("7d");

  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { setSnapshots(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  async function takeSnapshot() {
    setSnapping(true);
    await fetch("/api/analytics", { method: "POST" }).catch(() => null);
    setSnapping(false);
    load();
  }

  // All unique agent names across snapshots
  const allAgents = Array.from(
    new Set(snapshots.flatMap(s => Object.keys(s.tokensByAgent)))
  );

  // Time-series data: one point per snapshot
  const timeData = snapshots.map(s => ({
    time: fmtDate(s.ts) + " " + fmtTime(s.ts),
    ts: s.ts,
    tokens: s.totalTokens,
    cost: parseFloat(((s.totalTokens / 1_000_000) * PROVIDER_COST_PER_1M).toFixed(4)),
    ...Object.fromEntries(allAgents.map(a => [a, s.tokensByAgent[a] ?? 0])),
  }));

  // Per-agent totals (difference between last and first snapshot)
  const agentTotals = allAgents.map(name => {
    const first = snapshots[0]?.tokensByAgent[name] ?? 0;
    const last = snapshots[snapshots.length - 1]?.tokensByAgent[name] ?? 0;
    const delta = Math.max(0, last - first);
    return { name, tokens: delta, cost: (delta / 1_000_000) * PROVIDER_COST_PER_1M };
  }).sort((a, b) => b.tokens - a.tokens);

  const totalTokensDelta = agentTotals.reduce((s, a) => s + a.tokens, 0);
  const totalCost = (totalTokensDelta / 1_000_000) * PROVIDER_COST_PER_1M;
  const avgPerDay = snapshots.length > 1
    ? totalTokensDelta / Math.max(1, (snapshots[snapshots.length - 1].ts - snapshots[0].ts) / 86400_000)
    : 0;

  const RANGES: { key: Range; label: string }[] = [
    { key: "1d", label: "24h" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--color-surface)" }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="px-3 py-1 text-xs font-medium rounded-md transition-all"
              style={{
                background: range === r.key ? "var(--color-primary)" : "transparent",
                color: range === r.key ? "#fff" : "var(--color-text-muted)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={takeSnapshot}
          disabled={snapping}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
        >
          <RefreshCw size={12} className={snapping ? "animate-spin" : ""} />
          Snapshot now
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Zap, label: "Tokens used", value: fmtTokens(totalTokensDelta), sub: `${days}d window` },
          { icon: DollarSign, label: "Estimated cost", value: fmtCost(totalTokensDelta), sub: "blended $0.30/1M" },
          { icon: TrendingUp, label: "Daily average", value: fmtTokens(avgPerDay), sub: "tokens/day" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color: "var(--color-primary)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              {loading ? "—" : value}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm animate-pulse" style={{ color: "var(--color-text-muted)" }}>Loading snapshots…</p>
          </div>
        </div>
      ) : snapshots.length < 2 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-3xl">📊</p>
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>No historical data yet</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Click "Snapshot now" to record the current token state. Snapshots accumulate over time to show spend trends.
          </p>
        </div>
      ) : (
        <>
          {/* Token spend over time */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Token spend over time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickFormatter={v => fmtTokens(v as number)} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [fmtTokens(Number(v)), "Tokens"]}
                />
                <Area type="monotone" dataKey="tokens" stroke="var(--color-primary)" fill="url(#tokenGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Per-agent breakdown */}
          {agentTotals.length > 0 && (
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Tokens by agent ({days}d)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={agentTotals} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickFormatter={v => fmtTokens(v as number)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={120} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: unknown) => [fmtTokens(Number(v)), "Tokens"]}
                  />
                  <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                    {agentTotals.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="space-y-1 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                {agentTotals.map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: "var(--color-surface)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{a.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>{fmtTokens(a.tokens)} tokens</span>
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>{fmtCost(a.tokens)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1.5 px-2 mt-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Total</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: "var(--color-text-muted)" }}>{fmtTokens(totalTokensDelta)}</span>
                    <span className="font-bold" style={{ color: "var(--color-primary)" }}>${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
