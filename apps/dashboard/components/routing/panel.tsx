"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TrajectoryEntry {
  id: string;
  ts: string;
  agent: string;
  task: string;
  model: string;
  tier: string;
  outcome: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  draft_accepted?: boolean;
  tool_calls: string[];
  notes?: string;
}

interface Stats {
  total: number;
  byTier: Record<string, number>;
  byOutcome: Record<string, number>;
  byAgent: Record<string, number>;
  successRate: number;
  cheapRate: number;
  draftAcceptRate: number | null;
  avgLatencyMs: number;
  totalTokens: number;
  cheapRuns: number;
  expensiveRuns: number;
}

const TIER_COLOR: Record<string, string> = {
  simple:   "var(--color-secondary)",
  standard: "var(--color-primary)",
  complex:  "#f59e0b",
  expert:   "#ef4444",
};

const TIER_LABEL: Record<string, string> = {
  simple:   "Simple (DeepSeek)",
  standard: "Standard (MiMo)",
  complex:  "Complex (Nemotron)",
  expert:   "Expert (Claude)",
};

const OUTCOME_COLOR: Record<string, string> = {
  success: "var(--color-secondary)",
  fail:    "var(--color-error)",
  partial: "#f59e0b",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RoutingPanel() {
  const [data, setData] = useState<{ entries: TrajectoryEntry[]; stats: Stats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "fail">("all");

  useEffect(() => {
    fetch("/api/trajectories?days=7")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const entries = data?.entries ?? [];

  const tierChartData = Object.entries(stats?.byTier ?? {}).map(([tier, count]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    tierKey: tier,
    count,
  }));

  const filteredEntries = entries.filter(e => {
    if (filter === "success") return e.outcome === "success";
    if (filter === "fail") return e.outcome === "fail";
    return true;
  });

  // Cost savings estimate: assume expert=15x, complex=3x, standard=1.5x vs simple
  const COST_MULTIPLIER: Record<string, number> = { simple: 1, standard: 2, complex: 10, expert: 60 };
  const actualCost = Object.entries(stats?.byTier ?? {}).reduce(
    (s, [tier, n]) => s + n * (COST_MULTIPLIER[tier] ?? 1), 0
  );
  const worstCaseCost = (stats?.total ?? 0) * COST_MULTIPLIER.expert;
  const savingsPct = worstCaseCost > 0 ? Math.round((1 - actualCost / worstCaseCost) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Routing Intelligence
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Nemotron-inspired complexity routing · agent trajectory log · draft-verify stats
        </p>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total runs",
            value: loading ? "—" : String(stats?.total ?? 0),
            sub: "last 7 days",
          },
          {
            label: "Cheap tier rate",
            value: loading ? "—" : `${stats?.cheapRate ?? 0}%`,
            sub: "simple + standard",
            highlight: true,
          },
          {
            label: "Success rate",
            value: loading ? "—" : `${stats?.successRate ?? 0}%`,
            sub: "of all runs",
          },
          {
            label: "Est. cost savings",
            value: loading ? "—" : `${savingsPct}%`,
            sub: "vs routing all to expert",
            highlight: true,
          },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{ background: "var(--color-surface)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{m.label}</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: m.highlight ? "var(--color-primary)" : "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              {m.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle, var(--color-text-muted))" }}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Tier distribution chart */}
        <div className="rounded-xl p-5" style={{ background: "var(--color-surface)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>
            Tier Distribution
          </h2>
          {loading ? (
            <div className="h-32 animate-pulse rounded-lg" style={{ background: "var(--color-surface-2)" }} />
          ) : tierChartData.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--color-text-muted)" }}>
              No routing data yet — run some agent tasks
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={tierChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="tier" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, _: any, props: any) => [v, TIER_LABEL[props.payload?.tierKey] ?? "Runs"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tierChartData.map(d => (
                    <Cell key={d.tierKey} fill={TIER_COLOR[d.tierKey] ?? "var(--color-primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="mt-3 space-y-1">
            {Object.entries(TIER_LABEL).map(([tier, label]) => (
              <div key={tier} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TIER_COLOR[tier] }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                <span className="text-xs ml-auto font-mono" style={{ color: "var(--color-text)" }}>
                  {stats?.byTier[tier] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Draft-verify + agent breakdown */}
        <div className="space-y-4">
          {/* Draft-verify card */}
          <div className="rounded-xl p-5" style={{ background: "var(--color-surface)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Draft-Verify
            </h2>
            {!stats || stats.draftAcceptRate === null ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                No draft-verify runs logged yet. Use the <code className="font-mono">draft_verify</code> router MCP tool.
              </p>
            ) : (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
                    {stats.draftAcceptRate}%
                  </span>
                  <span className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>cheap draft accepted</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${stats.draftAcceptRate}%`, background: "var(--color-secondary)" }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                  Every accepted draft skips the expensive model call entirely.
                </p>
              </>
            )}
          </div>

          {/* Nemotron status */}
          <div className="rounded-xl p-5" style={{ background: "var(--color-surface)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Nemotron-3 Super
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: stats?.byTier?.complex ? "var(--color-secondary)" : "var(--color-text-subtle, var(--color-text-muted))" }}
              />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {stats?.byTier?.complex ? `${stats.byTier.complex} runs routed to complex tier` : "No complex-tier runs yet"}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Requires <code className="font-mono">NVIDIA_NIM_API_KEY</code>. Get one at{" "}
              <span className="font-mono">build.nvidia.com</span>.
              Model: <code className="font-mono">nvidia/nemotron-3-super-49b-v1</code>
            </p>
          </div>
        </div>
      </div>

      {/* Trajectory log table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Trajectory Log
          </h2>
          <div className="flex gap-1">
            {(["all", "success", "fail"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-md text-xs transition-colors"
                style={{
                  background: filter === f ? "var(--color-primary-dim)" : "transparent",
                  color: filter === f ? "var(--color-primary)" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No trajectory data yet. Agent runs logged via the <code className="font-mono">log_trajectory</code> router MCP tool will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                  {["Agent", "Task", "Tier", "Model", "Outcome", "Latency", "Time"].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-semibold"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.slice(0, 50).map(e => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: `1px solid var(--color-border)` }}
                    onMouseEnter={el => (el.currentTarget.style.background = "var(--color-surface-2)")}
                    onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text)" }}>
                      {e.agent}
                    </td>
                    <td
                      className="px-4 py-2.5 max-w-xs truncate"
                      style={{ color: "var(--color-text-muted)" }}
                      title={e.task}
                    >
                      {e.task}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: `color-mix(in srgb, ${TIER_COLOR[e.tier] ?? "var(--color-primary)"} 15%, transparent)`,
                          color: TIER_COLOR[e.tier] ?? "var(--color-primary)",
                        }}
                      >
                        {e.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {e.model.split("/").pop() ?? e.model}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: `color-mix(in srgb, ${OUTCOME_COLOR[e.outcome] ?? "var(--color-text-muted)"} 15%, transparent)`,
                          color: OUTCOME_COLOR[e.outcome] ?? "var(--color-text-muted)",
                        }}
                      >
                        {e.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {e.latency_ms ? `${e.latency_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-subtle, var(--color-text-muted))" }}>
                      {timeAgo(e.ts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distillation nudge */}
      {(stats?.total ?? 0) >= 50 && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)" }}
        >
          <span className="text-lg">🧠</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Distillation dataset ready
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {stats?.total} trajectory runs logged. This dataset can be used to fine-tune a cheap model to behave like your expensive agents — reducing tier requirements over time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
