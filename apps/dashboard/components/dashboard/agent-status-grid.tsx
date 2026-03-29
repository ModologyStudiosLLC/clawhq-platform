const agents = [
  { name: "Compass", emoji: "🧭", role: "CMO", status: "active", model: "claude-sonnet-4-6", tasks: 12 },
  { name: "Scout", emoji: "🔭", role: "Research", status: "active", model: "claude-sonnet-4-6", tasks: 8 },
  { name: "Scribe", emoji: "✍️", role: "Content", status: "active", model: "claude-sonnet-4-6", tasks: 5 },
  { name: "Codex", emoji: "⚙️", role: "Engineering", status: "active", model: "glm-5", tasks: 18 },
  { name: "Pixel", emoji: "🎨", role: "Design", status: "idle", model: "claude-sonnet-4-6", tasks: 3 },
  { name: "Fixer", emoji: "🔧", role: "DevOps", status: "active", model: "claude-haiku-4-5", tasks: 7 },
  { name: "Board", emoji: "📋", role: "PM", status: "active", model: "claude-sonnet-4-6", tasks: 4 },
  { name: "Counsel", emoji: "⚖️", role: "Legal", status: "idle", model: "claude-opus-4-6", tasks: 1 },
  { name: "Felix", emoji: "👨‍💼", role: "CEO", status: "active", model: "claude-sonnet-4-6", tasks: 22 },
];

const statusColor: Record<string, string> = {
  active: "var(--color-secondary)",
  idle: "var(--color-warning, #f6d969)",
  error: "var(--color-error, #ff6b6b)",
  offline: "var(--color-text-subtle)",
};

const statusBg: Record<string, string> = {
  active: "var(--color-secondary-dim)",
  idle: "rgba(246, 217, 105, 0.12)",
  error: "rgba(255, 107, 107, 0.12)",
  offline: "rgba(240, 240, 245, 0.05)",
};

export function AgentStatusGrid() {
  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <div
          key={agent.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
          style={{ background: "var(--color-surface-2)" }}
        >
          <span className="text-xl w-8 text-center">{agent.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{agent.name}</span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{agent.role}</span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>{agent.model}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{agent.tasks} tasks</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ background: statusBg[agent.status], color: statusColor[agent.status] }}
            >
              {agent.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
