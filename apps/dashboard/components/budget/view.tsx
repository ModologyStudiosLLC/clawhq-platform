"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface MetricsData {
  openfang_tokens_total?: Record<string, number>;
  openfang_agents_total?: number;
}

const PROVIDER_COST_PER_1M: Record<string, number> = {
  openrouter: 0.15,
  anthropic: 3.0,
  groq: 0.05,
  ollama: 0,
  openai: 2.5,
};

function inferProvider(name: string): string {
  if (name.toLowerCase().includes("hand")) return "openrouter";
  return "groq";
}

function estimateCost(tokens: number, name: string) {
  return (tokens / 1_000_000) * (PROVIDER_COST_PER_1M[inferProvider(name)] || 0.1);
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
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tokens this hour", value: loading ? "—" : totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : String(totalTokens), sub: "rolling window" },
          { label: "Estimated cost", value: loading ? "—" : `$${totalCost.toFixed(4)}`, sub: "this hour" },
          { label: "Active agents", value: loading ? "—" : String(agentData.length), sub: "using tokens" },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>{s.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>{s.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {!loading && agentData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-sm mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Token usage by agent</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={agentData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
              <XAxis
                dataKey="shortName"
                tick={{ fill: "rgba(240,240,245,0.5)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: "rgba(240,240,245,0.5)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v > 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
              />
              <Tooltip
                contentStyle={{ background: "#16161a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toLocaleString()} tokens`, "Usage"]}
              />
              <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                {agentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
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
          <div className="space-y-3">
            {agentData.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-sm flex-1 truncate" style={{ color: "var(--color-text)" }}>{a.name}</span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {a.tokens > 1000 ? `${(a.tokens / 1000).toFixed(0)}K` : a.tokens} tokens
                </span>
                <span className="text-xs w-14 text-right font-mono" style={{ color: "var(--color-text-muted)" }}>
                  ${a.cost.toFixed(4)}
                </span>
              </div>
            ))}
            <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Total</span>
              <span className="text-sm font-bold font-mono" style={{ color: "var(--color-primary)", fontFamily: "Manrope, sans-serif" }}>
                ${totalCost.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
