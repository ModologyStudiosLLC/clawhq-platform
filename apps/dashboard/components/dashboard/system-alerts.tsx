import { AlertCircle, CheckCircle, Info } from "lucide-react";

const alerts = [
  {
    severity: "info",
    title: "Firecrawl running",
    desc: "Self-hosted at port 3002, 0 rate limits",
    time: "2m ago",
  },
  {
    severity: "warning",
    title: "LinkedIn MCP",
    desc: "Session may need re-auth",
    time: "1h ago",
  },
  {
    severity: "success",
    title: "All cron jobs healthy",
    desc: "8 jobs delivering to Discord #openclaw",
    time: "5m ago",
  },
];

const config: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "var(--color-primary)", bg: "var(--color-primary-dim)" },
  warning: { icon: AlertCircle, color: "var(--color-warning, #f6d969)", bg: "rgba(246, 217, 105, 0.12)" },
  success: { icon: CheckCircle, color: "var(--color-secondary)", bg: "var(--color-secondary-dim)" },
  error: { icon: AlertCircle, color: "var(--color-error, #ff6b6b)", bg: "rgba(255, 107, 107, 0.12)" },
};

export function SystemAlerts() {
  return (
    <div>
      <h2 className="font-bold text-base mb-4" style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}>System Status</h2>
      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const { icon: Icon, color, bg } = config[alert.severity];
          return (
            <div key={i} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: bg }}
              >
                <Icon size={13} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{alert.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{alert.desc}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
