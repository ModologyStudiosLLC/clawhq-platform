"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  state: string;
  last_active: string;
  model_provider: string;
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

const providerColor: Record<string, string> = {
  openrouter: "var(--color-primary)",
  groq: "var(--color-secondary)",
  ollama: "var(--color-accent)",
  anthropic: "var(--color-primary)",
};

export function ActivityTimeline() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const sorted = [...d].sort((a, b) =>
            new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
          );
          setAgents(sorted.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="font-bold text-base mb-4" style={{ fontFamily: "var(--font-display)" }}>Recent Activity</h2>
      {agents.length === 0 ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: "var(--color-border)" }} />
          <div className="space-y-4">
            {agents.map((agent) => {
              const color = providerColor[agent.model_provider] || "var(--color-primary)";
              return (
                <div key={agent.id} className="flex gap-3 relative pl-7">
                  <div
                    className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: color, background: "var(--color-bg)" }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{agent.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {agent.state === "Running" ? "Running" : agent.state} · {agent.model_provider}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{timeAgo(agent.last_active)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
