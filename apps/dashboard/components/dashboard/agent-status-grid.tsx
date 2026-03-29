"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_name: string;
  model_provider: string;
  ready: boolean;
  last_active: string;
  profile: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const statusColor: Record<string, string> = {
  Running: "var(--color-secondary)",
  Crashed: "var(--color-error, #ff6b6b)",
  Stopped: "var(--color-text-subtle)",
};
const statusBg: Record<string, string> = {
  Running: "var(--color-secondary-dim)",
  Crashed: "rgba(255,107,107,0.12)",
  Stopped: "rgba(240,240,245,0.05)",
};

export function AgentStatusGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/agents").then(r => r.json()).then(d => setAgents(Array.isArray(d) ? d : [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
        ))}
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        <p className="text-sm">No agents found — is OpenFang running?</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const state = agent.state || "Unknown";
        return (
          <div
            key={agent.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            style={{ background: "var(--color-surface-2)" }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: statusColor[state] || "var(--color-text-subtle)" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{agent.name}</span>
                {agent.profile && (
                  <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{agent.profile}</span>
                )}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>
                {agent.model_provider} / {agent.model_name}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{timeAgo(agent.last_active)}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full capitalize"
                style={{ background: statusBg[state] || "rgba(240,240,245,0.05)", color: statusColor[state] || "var(--color-text-subtle)" }}
              >
                {state}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
