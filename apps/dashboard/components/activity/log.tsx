"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_provider: string;
  model_name: string;
  last_active: string;
}

interface Session {
  session_id: string;
  agent_id: string;
  message_count: number;
  created_at: string;
  label: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function agentEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("research")) return "🔭";
  if (n.includes("lead")) return "📊";
  if (n.includes("collector")) return "🔍";
  if (n.includes("predictor")) return "🔮";
  if (n.includes("writer")) return "✍️";
  if (n.includes("code") || n.includes("api")) return "⚙️";
  if (n.includes("support") || n.includes("customer")) return "💬";
  if (n.includes("data") || n.includes("analyst")) return "📈";
  return "🤖";
}

export function ActivityLog() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/sessions").then(r => r.json()).catch(() => ({ sessions: [] })),
    ]).then(([a, s]) => {
      setAgents(Array.isArray(a) ? a : []);
      setSessions(s.sessions || []);
      setLoading(false);
    });
  }, []);

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  // Build activity events from agents sorted by last_active
  const agentEvents = [...agents]
    .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
    .map(agent => ({
      id: agent.id,
      type: "agent_active" as const,
      agentId: agent.id,
      agentName: agent.name,
      description: agent.state === "Running" ? "Active and running" : "Needs attention",
      timestamp: agent.last_active,
      status: agent.state,
    }));

  // Build session events
  const sessionEvents = sessions
    .filter(s => s.message_count > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(s => ({
      id: s.session_id,
      type: "session" as const,
      agentId: s.agent_id,
      agentName: agentMap[s.agent_id]?.name || "Unknown agent",
      description: `${s.message_count} message${s.message_count !== 1 ? "s" : ""} in session`,
      timestamp: s.created_at,
      status: "info",
    }));

  const allEvents = [...agentEvents, ...sessionEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const statusColor: Record<string, string> = {
    Running: "var(--color-secondary)",
    Crashed: "var(--color-error, #ff6b6b)",
    info: "var(--color-primary)",
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">📜</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "var(--color-border)" }} />
          <div className="space-y-1">
            {allEvents.map(event => (
              <div key={event.id} className="flex gap-4 relative pl-12 py-2">
                <div
                  className="absolute left-3.5 top-3.5 w-3 h-3 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: statusColor[event.status] || "var(--color-primary)",
                    background: "var(--color-bg)",
                  }}
                />
                <div
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--color-surface)" }}
                >
                  <span className="text-base w-7 text-center flex-shrink-0">{agentEmoji(event.agentName)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{event.agentName}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{event.description}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
