"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface MetricsData {
  openfang_tokens_total?: Record<string, number>;
  error?: string;
}

// Rough cost per 1M tokens (input estimate)
const providerCostPer1M: Record<string, number> = {
  openrouter: 0.15,
  groq: 0.05,
  ollama: 0,
  anthropic: 3.0,
  openai: 2.5,
};

function estimateCost(tokens: number, agentName: string): number {
  // infer provider from agent name patterns
  const provider = agentName.includes("hand") ? "openrouter" : "groq";
  return (tokens / 1_000_000) * (providerCostPer1M[provider] || 0.1);
}

export function CostIntelligence() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tokensByAgent = (metrics?.openfang_tokens_total || {}) as Record<string, number>;

  const agentCosts = Object.entries(tokensByAgent)
    .map(([name, tokens]) => ({ name, tokens, cost: estimateCost(tokens, name) }))
    .filter(a => a.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  const totalTokens = agentCosts.reduce((s, a) => s + a.tokens, 0);
  const totalCost = agentCosts.reduce((s, a) => s + a.cost, 0);

  // Placeholder chart data (7-day trend — would need historical data endpoint)
  const chartData = [
    { day: "Mon", cost: 0.12 },
    { day: "Tue", cost: 0.18 },
    { day: "Wed", cost: 0.09 },
    { day: "Thu", cost: 0.24 },
    { day: "Fri", cost: 0.19 },
    { day: "Sat", cost: 0.07 },
    { day: "Sun", cost: totalCost },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>Cost Intelligence</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Token usage (rolling 1h window)</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
            {loading ? "—" : `${(totalTokens / 1000).toFixed(0)}K`}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>tokens</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`$${Number(v).toFixed(3)}`, "Est. cost"]}
          />
          <Area type="monotone" dataKey="cost" stroke="var(--color-primary)" strokeWidth={2} fill="url(#costGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-6 rounded animate-pulse" style={{ background: "var(--color-surface-2)" }} />
          ))
        ) : agentCosts.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--color-text-muted)" }}>No token data yet</p>
        ) : (
          agentCosts.map((a) => (
            <div key={a.name} className="flex items-center gap-3">
              <span className="text-xs w-28 truncate" style={{ color: "var(--color-text-muted)" }}>{a.name}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: totalTokens > 0 ? `${(a.tokens / totalTokens) * 100}%` : "0%", background: "var(--color-primary)" }}
                />
              </div>
              <span className="text-xs w-12 text-right" style={{ color: "var(--color-text-muted)" }}>
                {a.tokens > 1000 ? `${(a.tokens / 1000).toFixed(0)}K` : a.tokens}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
