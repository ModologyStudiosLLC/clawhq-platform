"use client";

import { useEffect, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Zap, DollarSign, Users, AlertCircle } from "lucide-react";

interface MetricsData {
  openfang_tokens_total?: Record<string, number>;
  openfang_agents_total?: number;
}

const PROVIDER_COST_PER_1M: Record<string, number> = {
  anthropic: 3.0,
  openai: 2.5,
  deepseek: 0.14,
  openrouter: 0.15,
  zai: 0.14,
  groq: 0.05,
  mistral: 0.25,
  together: 0.20,
  google: 0.35,
  cerebras: 0.10,
  xiaomi: 0.10,
  fireworks: 0.20,
  ollama: 0,
  huggingface: 0,
  custom: 0.10,
};

function inferProvider(name: string): string {
  if (name.toLowerCase().includes("hand")) return "openrouter";
  return "groq";
}

function estimateCost(tokens: number, name: string) {
  return (tokens / 1_000_000) * (PROVIDER_COST_PER_1M[inferProvider(name)] || 0.1);
}

function fmtTokens(tokens: number): string {
  return tokens > 1000 ? `${(tokens / 1000).toFixed(0)}K` : String(tokens);
}

export function BudgetView() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tokensByAgent = (metrics?.openfang_tokens_total || {}) as Record<string, number>;

  const agentData = Object.entries(tokensByAgent)
    .map(([name, tokens]) => ({
      name,
      tokens,
      cost: estimateCost(tokens, name),
      shortName: name.replace("-hand", "").replace(/([A-Z])/g, " $1").trim(),
    }))
    .filter(a => a.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

  const totalTokens = agentData.reduce((s, a) => s + a.tokens, 0);
  const totalCost = agentData.reduce((s, a) => s + a.cost, 0);
  const topAgent = agentData[0]?.shortName || "—";

  // Build cumulative cost for the Line series
  const chartData = agentData.map((a, i) => {
    const cumulativeCost = agentData.slice(0, i + 1).reduce((s, x) => s + x.cost, 0);
    return { ...a, cumulativeCost };
  });

  const COLORS = [
    "var(--color-primary)",
    "var(--color-secondary)",
    "var(--color-accent)",
    "#f6d969",
    "#ff9966",
    "#66ccff",
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Summary cards — 4 columns */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Tokens card with mini sparkline */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <Zap size={16} style={{ color: "var(--color-primary)" }} />
            {/* Mini sparkline: 5 faked bars */}
            <div className="flex items-end gap-0.5" style={{ height: 20 }}>
              {[40, 70, 55, 85, 60].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: `${h}%`,
                    borderRadius: 2,
                    background: "var(--color-primary)",
                    opacity: 0.6 + i * 0.08,
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>
            {loading ? "—" : fmtTokens(totalTokens)}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>Tokens this hour</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>rolling window</p>
        </div>

        {/* Cost card */}
        <div className="card p-5">
          <div className="flex items-center mb-2">
            <DollarSign size={16} style={{ color: "var(--color-secondary)" }} />
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>
            {loading ? "—" : `$${totalCost.toFixed(4)}`}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>Estimated cost</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>this hour</p>
        </div>

        {/* Active agents card */}
        <div className="card p-5">
          <div className="flex items-center mb-2">
            <Users size={16} style={{ color: "var(--color-accent)" }} />
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>
            {loading ? "—" : String(agentData.length)}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>Active agents</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>using tokens</p>
        </div>

        {/* Most used card */}
        <div className="card p-5">
          <div className="flex items-center mb-2">
            <span className="text-sm">🏆</span>
          </div>
          <p
            className="text-lg font-bold truncate"
            style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}
            title={topAgent}
          >
            {loading ? "—" : topAgent}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>Most used</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>top token agent</p>
        </div>
      </div>

      {/* ComposedChart: bars for tokens + line for cumulative cost */}
      {!loading && agentData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-sm mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Token usage &amp; cumulative cost</h2>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: -20, bottom: 40 }}>
              <XAxis
                dataKey="shortName"
                tick={{ fill: "rgba(240,240,245,0.5)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                yAxisId="tokens"
                tick={{ fill: "rgba(240,240,245,0.5)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v > 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                tick={{ fill: "rgba(240,240,245,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(3)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#16161a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  if (name === "tokens") return [`${Number(value).toLocaleString()} tokens`, "Tokens"] as [string, string];
                  if (name === "cumulativeCost") return [`$${Number(value).toFixed(4)}`, "Cumulative cost"] as [string, string];
                  return [`${value}`, `${name}`] as [string, string];
                }}
                labelFormatter={(label) => `Agent: ${label}`}
              />
              <Bar yAxisId="tokens" dataKey="tokens" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cumulativeCost"
                stroke="rgba(240,240,245,0.5)"
                strokeWidth={1.5}
                dot={{ fill: "rgba(240,240,245,0.6)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown list */}
      <div className="card p-6">
        <h2 className="font-bold text-sm mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Breakdown</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : agentData.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>No token usage in the last hour</p>
        ) : (
          <div className="space-y-4">
            {agentData.map((a, i) => {
              const pct = totalTokens > 0 ? (a.tokens / totalTokens * 100) : 0;
              return (
                <div key={a.name}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm flex-1 truncate" style={{ color: "var(--color-text)" }}>{a.name}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {fmtTokens(a.tokens)} · {pct.toFixed(1)}%
                    </span>
                    <span className="text-xs w-14 text-right font-mono" style={{ color: "var(--color-text-muted)" }}>
                      ${a.cost.toFixed(4)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 3,
                    borderRadius: 2,
                    background: "var(--color-surface-2)",
                    marginTop: 4,
                  }}>
                    <div style={{
                      width: `${pct.toFixed(1)}%`,
                      height: "100%",
                      borderRadius: 2,
                      background: COLORS[i % COLORS.length],
                    }} />
                  </div>
                </div>
              );
            })}
            <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Total</span>
              <span className="text-sm font-bold font-mono" style={{ color: "var(--color-primary)", fontFamily: "Manrope, sans-serif" }}>
                ${totalCost.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Budget alert */}
      <div className="card p-4 flex items-start gap-3">
        <AlertCircle size={16} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 min-w-0">
          {totalCost > 0.10 ? (
            <p className="text-sm" style={{ color: "#f6d969" }}>
              You&apos;ve spent <strong>${totalCost.toFixed(4)}</strong> this session.{" "}
              <a href="/settings" className="underline" style={{ color: "var(--color-text-muted)" }}>
                Set a limit →
              </a>
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No budget limit set.{" "}
              <a href="/settings" className="underline" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
                Set a limit →
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
