"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Zap, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendRow {
  day: string;
  agentId: string;
  agentName: string | null;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  runCount: number;
}

interface ByAgentRow {
  agentId: string;
  agentName: string | null;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  apiRunCount: number;
  subscriptionRunCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-accent)",
  "var(--color-warning)",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#60a5fa",
  "#fb923c",
  "#e879f9",
];

type Range = "30" | "60" | "90";
const RANGES: { key: Range; label: string }[] = [
  { key: "30", label: "30d" },
  { key: "60", label: "60d" },
  { key: "90", label: "90d" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDollars(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function agentLabel(row: { agentId: string; agentName: string | null }) {
  return row.agentName || row.agentId.slice(0, 8);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentCostTrendPanel() {
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [byAgent, setByAgent] = useState<ByAgentRow[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/costs?endpoint=trend&days=${range}`).then(r => r.json()),
      fetch(`/api/costs?endpoint=by-agent&from=${new Date(Date.now() - parseInt(range) * 86400_000).toISOString()}`).then(r => r.json()),
    ])
      .then(([trendData, agentData]) => {
        setTrend(Array.isArray(trendData) ? trendData : []);
        setByAgent(Array.isArray(agentData) ? agentData : []);
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // Derive all unique agents
  const agents = Array.from(
    new Map(
      trend.map(r => [r.agentId, { agentId: r.agentId, agentName: r.agentName }])
    ).values()
  );

  // All unique days, sorted
  const days = Array.from(new Set(trend.map(r => r.day))).sort();

  // Build time-series: one row per day, one key per agent
  const timeData = days.map(day => {
    const entry: Record<string, string | number> = { day, label: fmtDay(day) };
    for (const agent of agents) {
      const row = trend.find(r => r.day === day && r.agentId === agent.agentId);
      entry[agent.agentId] = row?.costCents ?? 0;
      entry[`${agent.agentId}_tokens`] = (row?.inputTokens ?? 0) + (row?.outputTokens ?? 0);
      entry[`${agent.agentId}_runs`] = row?.runCount ?? 0;
    }
    return entry;
  });

  // Totals from byAgent (for KPI cards)
  const totalCostCents = byAgent.reduce((s, a) => s + a.costCents, 0);
  const totalTokens = byAgent.reduce((s, a) => s + a.inputTokens + a.outputTokens, 0);
  const totalRuns = byAgent.reduce((s, a) => s + a.apiRunCount + a.subscriptionRunCount, 0);
  const topAgent = byAgent[0];

  const isEmpty = !loading && trend.length === 0;

  return (
    <div className="space-y-6">

      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Agent Cost Trend
        </h2>
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: DollarSign,
            label: "Total spend",
            value: loading ? "—" : fmtDollars(totalCostCents),
            sub: `last ${range} days`,
            color: "var(--color-primary)",
          },
          {
            icon: Zap,
            label: "Total tokens",
            value: loading ? "—" : fmtTokens(totalTokens),
            sub: "input + output",
            color: "var(--color-secondary)",
          },
          {
            icon: Activity,
            label: "Total runs",
            value: loading ? "—" : totalRuns.toLocaleString(),
            sub: "agent executions",
            color: "var(--color-accent)",
          },
          {
            icon: TrendingUp,
            label: "Top agent",
            value: loading ? "—" : (topAgent ? agentLabel(topAgent) : "—"),
            sub: topAgent ? fmtDollars(topAgent.costCents) : "no data",
            color: "var(--color-warning)",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Icon size={13} style={{ color }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</span>
            </div>
            <p
              className="text-xl font-bold tabular-nums truncate"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
            >
              {value}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-4 text-sm" style={{ color: "var(--color-warning)" }}>
          Failed to load cost data: {error}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !error && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-3xl">📊</p>
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            No cost data yet
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Cost events are recorded when agents run with API billing. Data will appear here once agents execute.
          </p>
        </div>
      )}

      {/* Multi-agent cost over time (stacked area) */}
      {!loading && !isEmpty && timeData.length > 0 && (
        <div className="card p-5 space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Daily spend per agent ({range}d)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                {agents.map((agent, i) => (
                  <linearGradient key={agent.agentId} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                tickFormatter={v => fmtDollars(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: unknown, name: unknown) => {
                  const agent = agents.find(a => a.agentId === String(name));
                  return [fmtDollars(Number(v)), agent ? agentLabel(agent) : String(name)] as [string, string];
                }}
                labelFormatter={label => `Date: ${label}`}
              />
              <Legend
                formatter={(value) => {
                  const agent = agents.find(a => a.agentId === value);
                  return agent ? agentLabel(agent) : value;
                }}
                wrapperStyle={{ fontSize: 11, color: "var(--color-text-muted)" }}
              />
              {agents.map((agent, i) => (
                <Area
                  key={agent.agentId}
                  type="monotone"
                  dataKey={agent.agentId}
                  stackId="1"
                  stroke={COLORS[i % COLORS.length]}
                  fill={`url(#grad-${i})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-agent bar breakdown */}
      {!loading && byAgent.length > 0 && (
        <div className="card p-5 space-y-4">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Total spend by agent ({range}d)
          </p>

          {/* Horizontal bar chart */}
          <ResponsiveContainer width="100%" height={Math.max(120, byAgent.length * 36)}>
            <BarChart
              data={byAgent.map(a => ({ ...a, label: agentLabel(a) }))}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                tickFormatter={v => fmtDollars(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text)" }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: unknown, name: unknown) => {
                  if (String(name) === "costCents") return [fmtDollars(Number(v)), "Cost"] as [string, string];
                  return [`${v}`, String(name)] as [string, string];
                }}
              />
              <Bar dataKey="costCents" radius={[0, 4, 4, 0]}>
                {byAgent.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Detail rows */}
          <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            {byAgent.map((agent, i) => {
              const tokens = agent.inputTokens + agent.outputTokens;
              const runs = agent.apiRunCount + agent.subscriptionRunCount;
              const costPerRun = runs > 0 ? agent.costCents / runs : 0;
              return (
                <div
                  key={agent.agentId}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg"
                  style={{ background: "var(--color-surface)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span
                    className="text-xs font-medium flex-1 truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {agentLabel(agent)}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {fmtTokens(tokens)} tok
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {runs} runs
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {fmtDollars(costPerRun)}/run
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums w-16 text-right"
                    style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
                  >
                    {fmtDollars(agent.costCents)}
                  </span>
                </div>
              );
            })}

            {/* Total row */}
            <div className="flex items-center gap-3 py-2 px-2 mt-1">
              <span className="w-2 h-2 flex-shrink-0" />
              <span className="text-xs font-semibold flex-1" style={{ color: "var(--color-text)" }}>
                Total
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {fmtTokens(totalTokens)} tok
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {totalRuns} runs
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                —
              </span>
              <span
                className="text-xs font-bold tabular-nums w-16 text-right"
                style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}
              >
                {fmtDollars(totalCostCents)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="h-48 animate-pulse rounded-lg" style={{ background: "var(--color-surface-2)" }} />
          </div>
          <div className="card p-6">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg" style={{ background: "var(--color-surface-2)" }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
