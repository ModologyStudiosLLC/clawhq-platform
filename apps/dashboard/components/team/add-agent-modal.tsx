"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const PROFILES = [
  { value: "general", label: "General Assistant" },
  { value: "coding", label: "Engineering" },
  { value: "messaging", label: "Support / Messaging" },
  { value: "research", label: "Research" },
  { value: "custom", label: "Custom" },
];

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (local)" },
];

export function AddAgentModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState("general");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/openfang/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          profile,
          model_provider: provider,
          model_name: model.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Unknown error");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "1.5rem" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--color-text)" }}
          >
            Add agent
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Agent name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Scout, Scribe, Counsel"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>

          {/* Profile */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Role / profile
            </label>
            <select
              value={profile}
              onChange={e => setProfile(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              {PROFILES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Model provider
            </label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Model name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Model name <span style={{ color: "var(--color-text-subtle)" }}>(optional override)</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="claude-sonnet-4-6"
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

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-error) 8%, transparent)", color: "var(--color-error)", border: "1px solid color-mix(in srgb, var(--color-error) 20%, transparent)" }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                color: "var(--color-on-brand)",
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Creating…" : "Create agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
