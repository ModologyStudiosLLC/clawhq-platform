"use client";

import { useState } from "react";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useAgentSocket, type AgentEvent } from "@/lib/use-agent-socket";

type Agent = import("@/hooks/use-agent-stream").Agent;
type Session = import("@/hooks/use-agent-stream").Session;

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

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const dayMs = new Date(iso).setHours(0, 0, 0, 0);
  const diff = Math.floor((todayMs - dayMs) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type FilterTab = "all" | "agents" | "sessions";

type ActivityEvent = {
  id: string;
  type: "agent_active" | "session";
  agentId: string;
  agentName: string;
  description: string;
  timestamp: string;
  status: string;
};

function wsEventToActivity(event: AgentEvent): ActivityEvent {
  return {
    id: `ws-${event.ts}-${event.agentId ?? event.sessionId ?? Math.random()}`,
    type: event.type.startsWith("session") ? "session" : "agent_active",
    agentId: event.agentId ?? event.sessionId ?? "",
    agentName: event.agentId ?? "Agent",
    description: event.message ?? event.type,
    timestamp: new Date(event.ts).toISOString(),
    status: event.type === "agent.error" ? "Crashed" : event.type === "agent.started" ? "Running" : "info",
  };
}

export function ActivityLog() {
  const { agents, sessions, connected, loading } = useAgentStream();
  const { events: wsEvents, connected: wsConnected } = useAgentSocket();
  const [filter, setFilter] = useState<FilterTab>("all");

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  // Build activity events from agents sorted by last_active
  const agentEvents: ActivityEvent[] = [...agents]
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
  const sessionEvents: ActivityEvent[] = sessions
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

  const wsActivityEvents = wsEvents.map(wsEventToActivity);

  const allEvents = [...wsActivityEvents, ...agentEvents, ...sessionEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);

  const filteredEvents = allEvents.filter(e => {
    if (filter === "agents") return e.type === "agent_active";
    if (filter === "sessions") return e.type === "session";
    return true;
  });

  // Stats
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const eventsToday = allEvents.filter(e => new Date(e.timestamp).getTime() >= todayStart).length;
  const agentsActive = agents.filter(a => a.state === "Running").length;
  const sessionCount = sessions.filter(s => s.message_count > 0).length;

  // Badge config per event type/status
  const badgeConfig: Record<string, { label: string; color: string; bg: string }> = {
    Running: { label: "Active", color: "var(--color-secondary)", bg: "color-mix(in srgb, var(--color-secondary) 12%, transparent)" },
    session: { label: "Session", color: "var(--color-primary)", bg: "color-mix(in srgb, var(--color-primary) 12%, transparent)" },
    Crashed: { label: "Down", color: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 12%, transparent)" },
  };

  function getBadge(event: ActivityEvent) {
    if (event.type === "session") return badgeConfig["session"];
    return badgeConfig[event.status] || { label: event.status, color: "var(--color-text-muted)", bg: "var(--color-surface-2)" };
  }

  const dotColor: Record<string, string> = {
    Running: "var(--color-secondary)",
    Crashed: "var(--color-error)",
    info: "var(--color-primary)",
  };

  // Group filtered events by date label
  const grouped: { label: string; events: ActivityEvent[] }[] = [];
  for (const event of filteredEvents) {
    const label = dateLabel(event.timestamp);
    const existing = grouped.find(g => g.label === label);
    if (existing) {
      existing.events.push(event);
    } else {
      grouped.push({ label, events: [event] });
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "agents", label: "Agents" },
    { key: "sessions", label: "Sessions" },
  ];

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      {/* Stats bar + live indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span>{eventsToday} events today</span>
          <span className="mx-2">·</span>
          <span>{agentsActive} agents active</span>
          <span className="mx-2">·</span>
          <span>{sessionCount} sessions</span>
        </p>
        <div className="flex items-center gap-1.5">
          {wsConnected ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--color-secondary)",
                  boxShadow: "0 0 6px var(--color-secondary)",
                  animation: "var(--animate-pulse-slow)",
                }}
              />
              <span className="text-xs font-semibold" style={{ color: "var(--color-secondary)" }}>
                ● LIVE
              </span>
            </>
          ) : (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-text-subtle)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                {connected ? "○ Polling" : "Reconnecting…"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--color-border)" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-4 py-2 text-xs font-medium transition-colors relative"
            style={{
              color: filter === tab.key ? "var(--color-primary)" : "var(--color-text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
            {filter === tab.key && (
              <span
                className="absolute bottom-0 left-0 right-0"
                style={{
                  height: 2,
                  borderRadius: "2px 2px 0 0",
                  background: "var(--color-primary)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">📜</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Sticky date header */}
              <div
                className="sticky top-0 z-10 py-1.5 mb-2"
                style={{ background: "var(--color-bg)" }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {group.label}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "var(--color-border)" }} />
                <div className="space-y-1">
                  {group.events.map(event => {
                    const badge = getBadge(event);
                    return (
                      <div key={event.id} className="flex gap-4 relative pl-12 py-2">
                        <div
                          className="absolute left-3.5 top-3.5 w-3 h-3 rounded-full border-2 flex-shrink-0"
                          style={{
                            borderColor: dotColor[event.status] || "var(--color-primary)",
                            background: dotColor[event.status] || "var(--color-primary)",
                          }}
                        />
                        <div
                          className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                          style={{ background: "var(--color-surface)" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)";
                          }}
                        >
                          <span className="text-base w-7 text-center flex-shrink-0">{agentEmoji(event.agentName)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{event.agentName}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{event.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs" style={{ color: "var(--color-text-subtle, var(--color-text-muted))" }}>
                              {timeAgo(event.timestamp)}
                            </span>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ color: badge.color, background: badge.bg }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
