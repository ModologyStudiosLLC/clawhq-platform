import { Zap, Bot, FileText, Search } from "lucide-react";

const actions = [
  { label: "New Idea Pipeline", icon: Zap, color: "var(--color-primary)", bg: "var(--color-primary-dim)" },
  { label: "Spin Up Agent", icon: Bot, color: "var(--color-secondary)", bg: "var(--color-secondary-dim)" },
  { label: "Brief Scribe", icon: FileText, color: "var(--color-accent)", bg: "var(--color-accent-dim)" },
  { label: "Research Task", icon: Search, color: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)" },
];

export function QuickActions() {
  return (
    <div>
      <h2 className="font-bold text-base mb-4" style={{ fontFamily: "var(--font-display)" }}>Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            className="flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-all duration-150 cursor-pointer"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: a.bg }}
            >
              <a.icon size={14} style={{ color: a.color }} />
            </div>
            <span className="text-xs font-medium leading-tight" style={{ color: "var(--color-text)" }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
