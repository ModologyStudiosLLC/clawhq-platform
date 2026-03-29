"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "Mon", cost: 0.42 },
  { day: "Tue", cost: 0.68 },
  { day: "Wed", cost: 0.55 },
  { day: "Thu", cost: 0.91 },
  { day: "Fri", cost: 0.73 },
  { day: "Sat", cost: 0.38 },
  { day: "Sun", cost: 0.84 },
];

const byAgent = [
  { name: "Felix", cost: 0.28, pct: 33 },
  { name: "Codex", cost: 0.21, pct: 25 },
  { name: "Compass", cost: 0.14, pct: 17 },
  { name: "Scout", cost: 0.11, pct: 13 },
  { name: "Others", cost: 0.10, pct: 12 },
];

export function CostIntelligence() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}>Cost Intelligence</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>7-day API spend trend</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}>$4.51</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>this week</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#69daff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#69daff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: "rgba(240,240,245,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(240,240,245,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#16161a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "rgba(240,240,245,0.7)" }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Cost"]}
          />
          <Area type="monotone" dataKey="cost" stroke="#69daff" strokeWidth={2} fill="url(#costGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {byAgent.map((a) => (
          <div key={a.name} className="flex items-center gap-3">
            <span className="text-xs w-16" style={{ color: "var(--color-text-muted)" }}>{a.name}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${a.pct}%`, background: "var(--color-primary)" }}
              />
            </div>
            <span className="text-xs w-10 text-right" style={{ color: "var(--color-text-muted)" }}>${a.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
