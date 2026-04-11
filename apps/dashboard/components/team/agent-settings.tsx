"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { AGENT_ROLE_META, type AgentRole } from "@/lib/types";

interface Agent {
  id: string;
  name: string;
  state: string;
  model_name: string;
  model_provider: string;
  profile: string | null;
  ready: boolean;
  last_active: string;
}

interface AgentBudget {
  total_cost_usd: number;
  total_tokens: number;
  session_count: number;
}

const PROFILES = [
  { value: "general", label: "General Assistant" },
  { value: "coding", label: "Engineering" },
  { value: "messaging", label: "Support / Messaging" },
  { value: "research", label: "Research" },
  { value: "custom", label: "Custom" },
];

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (local)" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AgentSettings({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [budget, setBudget] = useState<AgentBudget | null>(null);
  const [loading, setLoading] = useState(true);

  // edit state
  const [name, setName] = useState("");
  const [profile, setProfile] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [agentRole, setAgentRole] = useState<AgentRole>("worker");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch(`/api/openfang/api/budget/agents/${agentId}`).then(r => r.json()).catch(() => null),
    ]).then(([agents, b]) => {
      const found = (Array.isArray(agents) ? agents : []).find((a: Agent) => a.id === agentId);
      if (found) {
        setAgent(found);
        setName(found.name);
        setProfile(found.profile ?? "general");
        setProvider(found.model_provider ?? "anthropic");
        setModel(found.model_name ?? "");
        setAgentRole((found as any).agentRole ?? "worker");
      }
      setBudget(b);
      setLoading(false);
    });
  }, [agentId]);

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/openfang/api/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || agent.name,
          profile,
          model_provider: provider,
          model_name: model.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Refresh agent data
      fetch("/api/agents").then(r => r.json()).then(agents => {
        const found = (Array.isArray(agents) ? agents : []).find((a: Agent) => a.id === agentId);
        if (found) setAgent(found);
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestart() {
    setRestarting(true);
    try {
      await fetch(`/api/openfang/api/agents/${agentId}/restart`, { method: "POST" });
    } catch {
      // graceful — endpoint may not exist
    } finally {
      setTimeout(() => setRestarting(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="card p-8 text-center max-w-md">
        <p className="text-3xl mb-3">🤖</p>
        <h2 className="font-bold text-base mb-1" style={{ fontFamily: "var(--font-display)" }}>Agent not found</h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>This agent may have been removed.</p>
        <Link href="/team" className="text-sm" style={{ color: "var(--color-primary)" }}>← Back to team</Link>
      </div>
    );
  }

  const isActive = agent.state === "Running";

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">

      {/* Status card */}
      <div
        className="card p-5 flex items-center gap-4"
        style={{
          background: isActive
            ? "linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 6%, transparent) 0%, var(--color-surface) 60%)"
            : "linear-gradient(135deg, color-mix(in srgb, var(--color-error) 6%, transparent) 0%, var(--color-surface) 60%)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--color-surface-2)" }}
        >
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              {agent.name}
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: isActive ? "var(--color-secondary-dim)" : "color-mix(in srgb, var(--color-error) 12%, transparent)",
                color: isActive ? "var(--color-secondary)" : "var(--color-error)",
              }}
            >
              {isActive ? "Active" : agent.state}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}>
            {agent.model_provider} · {agent.model_name || "default model"} · last seen {timeAgo(agent.last_active)}
          </p>
        </div>
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 disabled:opacity-50"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
          title="Restart agent"
        >
          <RefreshCw size={12} className={restarting ? "animate-spin" : ""} />
          Restart
        </button>
      </div>

      {/* Usage / budget */}
      {budget && (
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
            Usage
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Sessions", value: String(budget.session_count ?? 0) },
              {
                label: "Tokens",
                value: budget.total_tokens > 1000000
                  ? `${(budget.total_tokens / 1000000).toFixed(1)}M`
                  : budget.total_tokens > 1000
                  ? `${(budget.total_tokens / 1000).toFixed(0)}K`
                  : String(budget.total_tokens ?? 0),
              },
              {
                label: "Est. cost",
                value: budget.total_cost_usd != null
                  ? `$${budget.total_cost_usd.toFixed(4)}`
                  : "—",
              },
            ].map(stat => (
              <div key={stat.label} className="text-center py-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
                <p className="font-bold text-xl" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit config */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Configuration
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              onFocus={e => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>

          {/* Team role */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Team role</label>
            <div className="grid grid-cols-3 gap-2">
              {(["worker", "observer", "operator"] as AgentRole[]).map(r => {
                const meta = AGENT_ROLE_META[r];
                const active = agentRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAgentRole(r)}
                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active ? meta.dim : "var(--color-surface-2)",
                      border: `1px solid ${active ? meta.color : "var(--color-border)"}`,
                      color: active ? meta.color : "var(--color-text-muted)",
                    }}
                  >
                    <span className="font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--color-text-subtle)" }}>
              {AGENT_ROLE_META[agentRole].description}
            </p>
          </div>

          {/* Profile */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Behavior profile</label>
            <select
              value={profile}
              onChange={e => setProfile(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              {PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>Model provider</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Model name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Model name <span style={{ color: "var(--color-text-subtle)" }}>(leave blank for provider default)</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. claude-sonnet-4-6"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
        </div>

        {saveError && (
          <p className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-error) 8%, transparent)", color: "var(--color-error)", border: "1px solid color-mix(in srgb, var(--color-error) 20%, transparent)" }}>
            {saveError}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{
            background: saved
              ? "var(--color-secondary-dim)"
              : "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            color: saved ? "var(--color-secondary)" : "var(--color-on-brand)",
            border: saved ? "1px solid var(--color-secondary)" : "none",
          }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? <><Check size={14} /> Saved</> : saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Danger zone */}
      <div
        className="card p-5"
        style={{ borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)", border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)" }}
      >
        <h3 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-error)", fontFamily: "var(--font-display)" }}>
          Danger zone
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>Permanent actions that cannot be undone.</p>
        <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Remove agent</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Permanently deletes this agent and all its session history.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm(`Delete ${agent.name}? This cannot be undone.`)) return;
              try {
                await fetch(`/api/openfang/api/agents/${agentId}`, { method: "DELETE" });
                window.location.href = "/team";
              } catch {
                // graceful
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0 ml-4"
            style={{ background: "color-mix(in srgb, var(--color-error) 10%, transparent)", color: "var(--color-error)", border: "1px solid color-mix(in srgb, var(--color-error) 35%, transparent)" }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
