"use client";

import { useEffect, useState } from "react";
import { Plus, MessageCircle, Settings2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AddAgentModal } from "./add-agent-modal";

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

// Map profile → readable role
function agentRole(agent: Agent): string {
  if (agent.profile === "coding") return "Engineering";
  if (agent.profile === "messaging") return "Support";
  if (agent.profile === "custom") return "Specialist";
  if (agent.name.toLowerCase().includes("research")) return "Research";
  if (agent.name.toLowerCase().includes("lead")) return "Lead Gen";
  if (agent.name.toLowerCase().includes("collector")) return "Intel";
  if (agent.name.toLowerCase().includes("predictor")) return "Forecasting";
  if (agent.name.toLowerCase().includes("writer")) return "Content";
  return "Assistant";
}

// Map provider → clean name
function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    openrouter: "Claude",
    anthropic: "Claude",
    groq: "Groq",
    ollama: "Local",
    openai: "GPT",
  };
  return map[provider] || provider;
}

// Pick an emoji based on name/role
function agentEmoji(agent: Agent): string {
  const n = agent.name.toLowerCase();
  if (n.includes("research")) return "🔭";
  if (n.includes("lead")) return "📊";
  if (n.includes("collector")) return "🔍";
  if (n.includes("predictor")) return "🔮";
  if (n.includes("writer")) return "✍️";
  if (n.includes("code") || n.includes("api")) return "⚙️";
  if (n.includes("support") || n.includes("customer")) return "💬";
  if (n.includes("data") || n.includes("analyst")) return "📈";
  if (n.includes("browser")) return "🌐";
  return "🤖";
}

export function TeamDirectory() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function loadAgents() {
    fetch("/api/agents")
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadAgents(); }, []);

  const active = agents.filter(a => a.state === "Running");
  const attention = agents.filter(a => a.state !== "Running");

  return (
    <div className="space-y-6 animate-fade-in">
      {showAdd && (
        <AddAgentModal
          onClose={() => setShowAdd(false)}
          onCreated={loadAgents}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {loading ? "Loading..." : `${active.length} active · ${attention.length} need attention`}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            color: "var(--color-on-brand)",
          }}
        >
          <Plus size={14} />
          Add agent
        </button>
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-error)" }}>
            Needs attention
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {attention.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Active team */}
      <div>
        {attention.length > 0 && (
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
            Active
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {active.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.state === "Running";
  const emoji = agentEmoji(agent);
  const role = agentRole(agent);
  const provider = providerLabel(agent.model_provider);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div
      className="card card-hover p-5 flex flex-col gap-3"
      style={{ borderColor: !isActive ? "color-mix(in srgb, var(--color-error) 20%, transparent)" : undefined }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: isActive ? "var(--color-surface-2)" : "rgba(255,107,107,0.1)" }}
          >
            {!isActive ? <AlertTriangle size={18} style={{ color: "var(--color-error)" }} /> : emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>
              {agent.name}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{role}</p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: isActive ? "var(--color-secondary-dim)" : "color-mix(in srgb, var(--color-error) 12%, transparent)",
            color: isActive ? "var(--color-secondary)" : "var(--color-error)",
          }}
        >
          {isActive ? "Active" : "Down"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
          {provider} · seen {timeAgo(agent.last_active)}
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        <Link
          href={`/team/${agent.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}
        >
          <MessageCircle size={12} />
          Talk
        </Link>
        <Link
          href={`/settings`}
          className="flex items-center justify-center p-2 rounded-lg transition-colors"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
          title="Settings"
        >
          <Settings2 size={13} />
        </Link>
      </div>
    </div>
  );
}
