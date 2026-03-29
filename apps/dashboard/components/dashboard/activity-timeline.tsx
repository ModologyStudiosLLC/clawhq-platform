const events = [
  { agent: "Codex", emoji: "⚙️", action: "Completed build task", time: "3m ago", color: "var(--color-primary)" },
  { agent: "Scout", emoji: "🔭", action: "Research brief delivered", time: "12m ago", color: "var(--color-secondary)" },
  { agent: "Compass", emoji: "🧭", action: "Drafted landing page copy", time: "28m ago", color: "var(--color-accent)" },
  { agent: "Felix", emoji: "👨‍💼", action: "Reviewed pipeline stage 2", time: "1h ago", color: "var(--color-primary)" },
  { agent: "Scribe", emoji: "✍️", action: "Email sequence drafted", time: "2h ago", color: "var(--color-secondary)" },
];

export function ActivityTimeline() {
  return (
    <div>
      <h2 className="font-bold text-base mb-4" style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}>Recent Activity</h2>
      <div className="relative">
        <div
          className="absolute left-3 top-0 bottom-0 w-px"
          style={{ background: "var(--color-border)" }}
        />
        <div className="space-y-4">
          {events.map((e, i) => (
            <div key={i} className="flex gap-3 relative pl-7">
              <div
                className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 flex-shrink-0"
                style={{ borderColor: e.color, background: "var(--color-bg)" }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span>{e.emoji}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{e.agent}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{e.action}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
