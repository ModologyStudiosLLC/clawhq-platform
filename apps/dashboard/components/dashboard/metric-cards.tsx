import { Bot, CheckCircle, DollarSign, TrendingUp } from "lucide-react";

const metrics = [
  {
    label: "Active Agents",
    value: "9",
    sub: "of 9 total",
    icon: Bot,
    color: "var(--color-primary)",
    bg: "var(--color-primary-dim)",
    trend: "+2 today",
    trendUp: true,
  },
  {
    label: "Tasks Today",
    value: "47",
    sub: "across all agents",
    icon: CheckCircle,
    color: "var(--color-secondary)",
    bg: "var(--color-secondary-dim)",
    trend: "94% success",
    trendUp: true,
  },
  {
    label: "Cost Today",
    value: "$0.84",
    sub: "API spend",
    icon: DollarSign,
    color: "var(--color-accent)",
    bg: "var(--color-accent-dim)",
    trend: "-12% vs avg",
    trendUp: false,
  },
  {
    label: "Month to Date",
    value: "$18.20",
    sub: "of $50 budget",
    icon: TrendingUp,
    color: "var(--color-warning, #f6d969)",
    bg: "rgba(246, 217, 105, 0.12)",
    trend: "36% used",
    trendUp: false,
  },
];

export function MetricCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="card card-hover p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: m.bg }}
            >
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: m.trendUp ? "var(--color-secondary-dim)" : "var(--color-primary-dim)",
                color: m.trendUp ? "var(--color-secondary)" : "var(--color-primary)",
              }}
            >
              {m.trend}
            </span>
          </div>
          <div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)", color: "var(--color-text)" }}
            >
              {m.value}
            </p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-text)" }}>{m.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{m.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
