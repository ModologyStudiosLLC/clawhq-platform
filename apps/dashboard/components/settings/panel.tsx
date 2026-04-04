"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Check, RefreshCw, Eye, EyeOff, Zap, Shield, Bot, Wallet, Sliders,
  ChevronDown, AlertTriangle, Sparkles, X, Save, Plug, Package, Download, Trash2, KeyRound
} from "lucide-react";
import { ChannelWizard, type ChannelId } from "@/components/channels/wizard";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentConfig {
  model: string;
  tools: Record<string, boolean>;
  schedule: string;
}

type TaskType = "code" | "research" | "summary" | "creative" | "chat";

interface ModelRouterSettings {
  enabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  budgetThreshold: number;
  ollamaEnabled: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  selfLearning: boolean;
  selfLearningSampleThreshold: number;
  lockedTaskTypes: string[];
  taskTypeOverrides: Record<string, string>;
}

interface Settings {
  securityLevel: 0 | 1 | 2 | 3;
  timezone: string;
  displayName: string;
  agents: Record<string, AgentConfig>;
  monthlyBudgetCents: number;
  budgetUnlimited: boolean;
  budgetAlertPercent: number;
  providerCaps: Record<string, number>;
  modelRouter: ModelRouterSettings;
}

const DEFAULT_SETTINGS: Settings = {
  securityLevel: 1,
  timezone: "UTC",
  displayName: "",
  agents: {
    hermes: { model: "claude-sonnet-4-6", tools: { web_search: true, code_exec: true, memory: true, calendar: false }, schedule: "" },
    openfang: { model: "claude-sonnet-4-6", tools: { bash: true, file_write: true, browser: false, code_exec: true }, schedule: "" },
  },
  monthlyBudgetCents: 2000,
  budgetUnlimited: false,
  budgetAlertPercent: 80,
  providerCaps: {
    anthropic: 0, openai: 0, deepseek: 0, openrouter: 0,
    zai: 0, groq: 0, mistral: 0, together: 0,
    google: 0, cerebras: 0, xiaomi: 0, fireworks: 0,
    ollama: 0, huggingface: 0, custom: 0,
  },
  modelRouter: {
    enabled: true,
    primaryModel: "anthropic/claude-sonnet-4-6",
    fallbackModel: "anthropic/claude-haiku-4-5",
    budgetThreshold: 80,
    ollamaEnabled: true,
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "llama3.2",
    selfLearning: true,
    selfLearningSampleThreshold: 20,
    lockedTaskTypes: [],
    taskTypeOverrides: {},
  },
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SECURITY_LEVELS = [
  { label: "Locked", description: "Agents cannot modify files or run code", color: "#ef4444" },
  { label: "Balanced", description: "Safe defaults — most tasks work", color: "#f6d969" },
  { label: "Open", description: "Agents can write files and run commands", color: "#69daff" },
  { label: "Dev Mode", description: "Unrestricted — use in dev environments only", color: "#ac8aff" },
];

const MODELS = [
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", cost: "$", description: "Fastest, cheapest" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", cost: "$$", description: "Best balance" },
  { id: "claude-opus-4-6", name: "Opus 4.6", cost: "$$$", description: "Most capable" },
];

const AGENT_TOOLS: Record<string, { key: string; label: string }[]> = {
  hermes: [
    { key: "web_search", label: "Web search" },
    { key: "code_exec", label: "Code execution" },
    { key: "memory", label: "Persistent memory" },
    { key: "calendar", label: "Calendar access" },
  ],
  openfang: [
    { key: "bash", label: "Bash / shell" },
    { key: "file_write", label: "File writes" },
    { key: "browser", label: "Browser automation" },
    { key: "code_exec", label: "Code execution" },
  ],
};

// Log scale: $1 → $500/mo
function centsToSlider(cents: number): number {
  const clamped = Math.max(100, Math.min(50000, cents));
  return Math.round((Math.log(clamped) - Math.log(100)) / (Math.log(50000) - Math.log(100)) * 100);
}
function sliderToCents(value: number): number {
  return Math.round(Math.exp(
    Math.log(100) + (value / 100) * (Math.log(50000) - Math.log(100))
  ));
}
function formatBudget(cents: number): string {
  if (cents < 100) return "<$1";
  const d = cents / 100;
  return d >= 100 ? `$${Math.round(d)}` : `$${d.toFixed(0)}`;
}

// Simple cron description
function describeCron(expr: string): string {
  if (!expr.trim()) return "";
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid cron expression";
  const [min, hour, dom, month, dow] = parts;
  if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "Every minute";
  if (dom === "*" && month === "*" && dow === "*") {
    if (min === "0" && hour !== "*") return `Daily at ${hour.padStart(2, "0")}:00 UTC`;
    if (hour !== "*") return `Daily at ${hour.padStart(2, "0")}:${min.padStart(2, "0")} UTC`;
  }
  if (dom === "*" && month === "*" && dow !== "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[parseInt(dow)] ?? `day ${dow}`;
    if (hour !== "*") return `Every ${dayName} at ${hour.padStart(2, "0")}:${min.padStart(2, "0")} UTC`;
    return `Every ${dayName}`;
  }
  if (min.startsWith("*/")) return `Every ${min.slice(2)} minutes`;
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  return expr;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback(() => {
    setSaved(true);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setSaved(false), 2000);
  }, []);
  return [saved, flash];
}

function KeyRow({
  emoji, label, placeholder, defaultValue, note, onSave, wizardChannel, onOpenWizard,
}: {
  emoji: string; label: string; placeholder: string; defaultValue?: string; note?: string;
  onSave: (v: string) => Promise<void>; wizardChannel?: ChannelId;
  onOpenWizard?: (ch: ChannelId) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSaved();

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      flashSaved();
      toast.success(`${label} key saved`);
    } catch {
      toast.error(`Failed to save ${label} key`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <span className="text-xl w-8 text-center flex-shrink-0">{emoji}</span>
      <div className="w-36 flex-shrink-0">
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</span>
        {note && <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{note}</div>}
      </div>
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <input type={show ? "text" : "password"} value={value} onChange={e => setValue(e.target.value)}
          placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--color-text)" }} />
        <button onClick={() => setShow(v => !v)} style={{ color: "var(--color-text-muted)" }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {wizardChannel && onOpenWizard && (
        <button onClick={() => onOpenWizard(wizardChannel)}
          className="px-2.5 py-2 rounded-lg text-xs flex items-center gap-1 flex-shrink-0 transition-all"
          style={{ background: "var(--color-primary-dim)", border: "1px solid rgba(105,218,255,0.25)", color: "var(--color-primary)" }}>
          <Zap size={12} /><span className="hidden sm:inline">Guide</span>
        </button>
      )}
      <button onClick={handleSave} disabled={saving || !value.trim()}
        className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all disabled:opacity-40"
        style={{
          background: saved ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
          color: saved ? "var(--color-secondary)" : "var(--color-text-muted)",
          border: `1px solid ${saved ? "var(--color-secondary)" : "var(--color-border)"}`,
        }}>
        {saved ? <Check size={13} /> : saving ? "Saving…" : "Save"}
        {saved && <span>Saved</span>}
      </button>
    </div>
  );
}

// ── Tab: General ──────────────────────────────────────────────────────────────

function GeneralTab({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const level = settings.securityLevel;

  return (
    <div className="space-y-6">
      {/* Security level slider */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Security Level
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
          Controls what your agents are allowed to do.
        </p>

        {/* 4-stop slider */}
        <div className="relative mb-4">
          <div className="flex justify-between mb-2">
            {SECURITY_LEVELS.map((s, i) => (
              <button key={i} onClick={() => onChange({ securityLevel: i as 0|1|2|3 })}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-lg mx-0.5 transition-all"
                style={{
                  background: level === i ? `${s.color}22` : "var(--color-surface-2)",
                  color: level === i ? s.color : "var(--color-text-muted)",
                  border: `1px solid ${level === i ? s.color : "var(--color-border)"}`,
                  boxShadow: level === i ? `0 0 16px ${s.color}30` : "none",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: `${SECURITY_LEVELS[level].color}11`, border: `1px solid ${SECURITY_LEVELS[level].color}33` }}>
          <Shield size={16} className="mt-0.5 flex-shrink-0" style={{ color: SECURITY_LEVELS[level].color }} />
          <p className="text-sm" style={{ color: "var(--color-text)" }}>
            {SECURITY_LEVELS[level].description}
          </p>
        </div>
      </div>

      {/* Display name & timezone */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Preferences
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Display Name
            </label>
            <input value={settings.displayName}
              onChange={e => onChange({ displayName: e.target.value })}
              placeholder="Your name or team name"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Timezone
            </label>
            <select value={settings.timezone} onChange={e => onChange({ timezone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"
              ].map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: "1.5rem", border: "1px solid rgba(239,68,68,0.35)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "#ef4444", fontFamily: "var(--font-display)" }}>
          Danger Zone
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          These actions are irreversible — proceed with caution.
        </p>
        <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Reset onboarding</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Clears setup state and API key, then restarts the onboarding wizard.
            </p>
          </div>
          <button onClick={() => {
            document.cookie = "clawhq_setup=; path=/; max-age=0";
            localStorage.removeItem("clawhq_anthropic_key");
            window.location.href = "/onboarding";
          }} className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0 ml-4 transition-all"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)" }}>
            Reset onboarding
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Agents ────────────────────────────────────────────────────────────────

function AgentSection({ agentId, config, onChange }: {
  agentId: string;
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}) {
  const [open, setOpen] = useState(true);
  const tools = AGENT_TOOLS[agentId] ?? [];
  const cronDesc = describeCron(config.schedule);

  return (
    <div className="card overflow-hidden" style={{ marginBottom: "1rem" }}>
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors"
        style={{ borderBottom: open ? "1px solid var(--color-border)" : "none" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-primary-dim)", border: "1px solid rgba(105,218,255,0.2)" }}>
          <Bot size={15} style={{ color: "var(--color-primary)" }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold capitalize" style={{ color: "var(--color-text)" }}>{agentId}</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {MODELS.find(m => m.id === config.model)?.name ?? config.model}
            {cronDesc ? ` · ${cronDesc}` : " · no schedule"}
          </p>
        </div>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-muted)" }} />
      </button>

      {open && (
        <div className="px-5 py-4 space-y-5">
          {/* Model picker */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-subtle)" }}>Model</label>
            <div className="flex gap-2 flex-wrap">
              {MODELS.map(m => (
                <button key={m.id} onClick={() => onChange({ model: m.id })}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                  style={{
                    background: config.model === m.id ? "var(--color-primary-dim)" : "var(--color-surface-2)",
                    border: `1px solid ${config.model === m.id ? "var(--color-primary)" : "var(--color-border)"}`,
                    color: config.model === m.id ? "var(--color-primary)" : "var(--color-text-muted)",
                  }}>
                  <span className="font-bold">{m.cost}</span>
                  <span className="font-medium">{m.name}</span>
                  <span style={{ opacity: 0.7 }}>{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool toggles */}
          {tools.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2"
                style={{ color: "var(--color-text-subtle)" }}>Tool Access</label>
              <div className="grid grid-cols-2 gap-2">
                {tools.map(t => {
                  const enabled = config.tools[t.key] ?? false;
                  return (
                    <button key={t.key} onClick={() => onChange({ tools: { ...config.tools, [t.key]: !enabled } })}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-left transition-all"
                      style={{
                        background: enabled ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
                        border: `1px solid ${enabled ? "rgba(105,246,184,0.3)" : "var(--color-border)"}`,
                      }}>
                      <div className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0"
                        style={{
                          background: enabled ? "var(--color-secondary)" : "transparent",
                          borderColor: enabled ? "var(--color-secondary)" : "var(--color-border-strong)",
                        }}>
                        {enabled && <Check size={9} style={{ color: "#0e0e10" }} />}
                      </div>
                      <span style={{ color: enabled ? "var(--color-text)" : "var(--color-text-muted)" }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-subtle)" }}>Schedule (cron)</label>
            <div className="flex flex-col gap-1.5">
              <input value={config.schedule}
                onChange={e => onChange({ schedule: e.target.value })}
                placeholder="e.g. 0 9 * * 1-5  (weekdays at 9am)"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
              {cronDesc && (
                <p className="text-xs px-1" style={{ color: cronDesc === "Invalid cron expression" ? "var(--color-error)" : "var(--color-secondary)" }}>
                  ↳ {cronDesc}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentsTab({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  function updateAgent(agentId: string, patch: Partial<AgentConfig>) {
    onChange({
      agents: {
        ...settings.agents,
        [agentId]: { ...settings.agents[agentId], ...patch },
      },
    });
  }

  return (
    <div className="space-y-0">
      {Object.entries(settings.agents).map(([id, config]) => (
        <AgentSection key={id} agentId={id} config={config}
          onChange={patch => updateAgent(id, patch)} />
      ))}
    </div>
  );
}

// ── Tab: Channels ─────────────────────────────────────────────────────────────

function ChannelsTab({ onOpenWizard }: { onOpenWizard: (ch: ChannelId) => void }) {
  const anthropicDefault = typeof window !== "undefined" ? localStorage.getItem("clawhq_anthropic_key") ?? "" : "";

  async function saveLlmKey(provider: string, key: string) {
    // Push to both openfang and openclaw so all agents pick it up
    await Promise.allSettled([
      fetch("/api/openfang/api/config/keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      }),
      fetch("/api/openclaw/config/providers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      }),
    ]);
  }

  async function saveChannelToken(channel: string, token: string) {
    try {
      await fetch("/api/openclaw/config/channels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, token }),
      });
    } catch { /* graceful */ }
  }

  // Provider groups matching openclaw + hermes supported providers
  const cloudProviders = [
    { emoji: "🤖", label: "Anthropic", placeholder: "sk-ant-...", provider: "anthropic",
      onSave: (key: string) => { localStorage.setItem("clawhq_anthropic_key", key); return saveLlmKey("anthropic", key); },
      defaultValue: anthropicDefault },
    { emoji: "🟢", label: "OpenAI", placeholder: "sk-...", provider: "openai" },
    { emoji: "🔵", label: "DeepSeek", placeholder: "sk-...", provider: "deepseek", note: "Fast + cheap" },
    { emoji: "🔀", label: "OpenRouter", placeholder: "sk-or-...", provider: "openrouter", note: "100+ models" },
    { emoji: "✳️", label: "ZAI (GLM)", placeholder: "zai-...", provider: "zai", note: "GLM-5, GLM-4.7" },
    { emoji: "🐱", label: "Groq", placeholder: "gsk_...", provider: "groq", note: "Ultra-fast inference" },
    { emoji: "🌟", label: "Mistral", placeholder: "...", provider: "mistral" },
    { emoji: "🔥", label: "Together AI", placeholder: "...", provider: "together", note: "Open source models" },
    { emoji: "💎", label: "Google Gemini", placeholder: "AIza...", provider: "google" },
    { emoji: "🧠", label: "Cerebras", placeholder: "csk-...", provider: "cerebras", note: "Free tier · very fast" },
    { emoji: "🦙", label: "Xiaomi Mimo", placeholder: "tp-...", provider: "xiaomi", note: "Used by Hermes" },
    { emoji: "🔮", label: "Fireworks AI", placeholder: "fw-...", provider: "fireworks" },
  ];

  const openProviders = [
    { emoji: "🏠", label: "Ollama (local)", placeholder: "http://localhost:11434", provider: "ollama", isUrl: true, note: "No key needed — just base URL" },
    { emoji: "🤗", label: "Hugging Face", placeholder: "hf_...", provider: "huggingface", note: "Free inference API" },
    { emoji: "🌐", label: "Custom OpenAI-compat.", placeholder: "https://api.example.com/v1", provider: "custom", isUrl: true, note: "Any OpenAI-compatible endpoint" },
  ];

  return (
    <div className="space-y-6">
      {/* Cloud providers */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          LLM API Keys — Cloud
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Saved keys are pushed to OpenClaw and OpenFang so all your agents can use them.
        </p>
        {cloudProviders.map(p => (
          <KeyRow key={p.provider} emoji={p.emoji} label={p.label} placeholder={p.placeholder}
            defaultValue={p.defaultValue}
            note={p.note}
            onSave={p.onSave ?? ((key: string) => saveLlmKey(p.provider, key))} />
        ))}
      </div>

      {/* Open / local providers */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Open &amp; Local Providers
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Self-hosted and open-source inference endpoints.
        </p>
        {openProviders.map(p => (
          <KeyRow key={p.provider} emoji={p.emoji} label={p.label} placeholder={p.placeholder}
            note={p.note}
            onSave={(key: string) => saveLlmKey(p.provider, key)} />
        ))}
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Channel Tokens
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Connect external channels so your agents can receive and send messages.
          Hit <span style={{ color: "var(--color-primary)" }}>Guide</span> for step-by-step setup.
        </p>
        <KeyRow emoji="💬" label="Discord" placeholder="Bot token..." wizardChannel="discord" onOpenWizard={onOpenWizard}
          onSave={token => saveChannelToken("discord", token)} />
        <KeyRow emoji="✈️" label="Telegram" placeholder="Bot token..." wizardChannel="telegram" onOpenWizard={onOpenWizard}
          onSave={token => saveChannelToken("telegram", token)} />
        <KeyRow emoji="🟣" label="Slack" placeholder="xoxb-..." wizardChannel="slack" onOpenWizard={onOpenWizard}
          onSave={token => saveChannelToken("slack", token)} />
        <KeyRow emoji="📱" label="WhatsApp" placeholder="Token..."
          onSave={token => saveChannelToken("whatsapp", token)} />
      </div>
    </div>
  );
}

// ── Tab: Budget ────────────────────────────────────────────────────────────────

function BudgetTab({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const sliderVal = centsToSlider(settings.monthlyBudgetCents);

  return (
    <div className="space-y-6">
      {/* Monthly budget slider */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Monthly Budget
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
          Hard cap across all agents and providers. You&apos;ll receive an alert when you hit the threshold.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            {settings.budgetUnlimited ? "∞" : formatBudget(settings.monthlyBudgetCents)}
          </div>
          {!settings.budgetUnlimited && (
            <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>/mo</div>
          )}
          <div className="ml-auto">
            <button onClick={() => onChange({ budgetUnlimited: !settings.budgetUnlimited })}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: settings.budgetUnlimited ? "var(--color-accent-dim)" : "var(--color-surface-2)",
                border: `1px solid ${settings.budgetUnlimited ? "var(--color-accent)" : "var(--color-border)"}`,
                color: settings.budgetUnlimited ? "var(--color-accent)" : "var(--color-text-muted)",
              }}>
              {settings.budgetUnlimited ? "Unlimited" : "Set limit"}
            </button>
          </div>
        </div>

        {!settings.budgetUnlimited && (
          <>
            <input type="range" min={0} max={100} value={sliderVal}
              onChange={e => onChange({ monthlyBudgetCents: sliderToCents(parseInt(e.target.value)) })}
              className="w-full mb-3"
              style={{ accentColor: "var(--color-primary)" }} />
            <div className="flex justify-between text-xs" style={{ color: "var(--color-text-subtle)" }}>
              <span>$1</span><span>$10</span><span>$50</span><span>$200</span><span>$500</span>
            </div>
          </>
        )}

        {!settings.budgetUnlimited && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Alert threshold
              </label>
              <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                {settings.budgetAlertPercent}%
              </span>
            </div>
            <input type="range" min={50} max={95} step={5} value={settings.budgetAlertPercent}
              onChange={e => onChange({ budgetAlertPercent: parseInt(e.target.value) })}
              className="w-full"
              style={{ accentColor: "var(--color-warning)" }} />
            <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
              Alert when {settings.budgetAlertPercent}% of {formatBudget(settings.monthlyBudgetCents)} is used
              ({formatBudget(Math.round(settings.monthlyBudgetCents * settings.budgetAlertPercent / 100))})
            </p>
          </div>
        )}
      </div>

      {/* Per-provider caps */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Per-Provider Caps
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Optional per-provider sub-limits (0 = no sub-limit).
        </p>
        <div className="space-y-3">
          {Object.entries(settings.providerCaps).map(([provider, cents]) => {
            const LABELS: Record<string, string> = {
              anthropic: "Anthropic", openai: "OpenAI", deepseek: "DeepSeek",
              openrouter: "OpenRouter", zai: "ZAI (GLM)", groq: "Groq",
              mistral: "Mistral", together: "Together AI", google: "Google Gemini",
              cerebras: "Cerebras", xiaomi: "Xiaomi Mimo", fireworks: "Fireworks AI",
              ollama: "Ollama", huggingface: "Hugging Face", custom: "Custom",
            };
            return (
            <div key={provider} className="flex items-center gap-3">
              <span className="text-sm font-medium w-32 flex-shrink-0"
                style={{ color: "var(--color-text)" }}>{LABELS[provider] ?? provider}</span>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>$</span>
                <input type="number" min={0} step={1}
                  value={cents > 0 ? (cents / 100).toFixed(0) : ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    onChange({ providerCaps: { ...settings.providerCaps, [provider]: isNaN(v) ? 0 : Math.round(v * 100) } });
                  }}
                  placeholder="No limit"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--color-text)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>/mo</span>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── NL Propose box ─────────────────────────────────────────────────────────────

function NaturalLanguageInput({ currentSettings, onPropose }: {
  currentSettings: Settings;
  onPropose: (diff: Partial<Settings>) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, currentSettings }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onPropose(data.diff);
      setText("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "1rem 1.25rem", border: "1px solid rgba(105,218,255,0.2)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} style={{ color: "var(--color-primary)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
          AI Settings Assistant
        </span>
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. &quot;Set Hermes to Haiku and limit budget to $20/mo&quot;"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          disabled={loading} />
        <button onClick={handleSubmit} disabled={loading || !text.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: "var(--color-primary-dim)", border: "1px solid rgba(105,218,255,0.3)", color: "var(--color-primary)" }}>
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "Thinking…" : "Apply"}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--color-error)" }}>
          <AlertTriangle size={12} />{error}
        </p>
      )}
    </div>
  );
}

// ── Unsaved changes bar ────────────────────────────────────────────────────────

function UnsavedBar({ dirty, saving, onSave, onDiscard }: {
  dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", backdropFilter: "blur(12px)" }}>
      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Unsaved changes</span>
      <button onClick={onDiscard}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
        <X size={12} /> Discard
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#0e0e10" }}>
        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

// ── Pending-proposal confirm banner ────────────────────────────────────────────

function ProposalBanner({ diff, onAccept, onReject }: {
  diff: Partial<Settings>; onAccept: () => void; onReject: () => void;
}) {
  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3 animate-slide-up"
      style={{ background: "var(--color-accent-dim)", border: "1px solid rgba(172,138,255,0.3)" }}>
      <Sparkles size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--color-text)" }}>
          AI proposed changes
        </p>
        <pre className="text-xs font-mono overflow-x-auto" style={{ color: "var(--color-text-muted)" }}>
          {JSON.stringify(diff, null, 2)}
        </pre>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={onAccept}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)", border: "1px solid rgba(105,246,184,0.3)" }}>
          Apply
        </button>
        <button onClick={onReject}
          className="px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
          Ignore
        </button>
      </div>
    </div>
  );
}

// ── Tab: Integrations (MCP Tier 1) ────────────────────────────────────────────

interface IntegrationConfig {
  enabled: boolean;
  credential: string;
  status: "idle" | "testing" | "ok" | "error";
  errorMsg?: string;
}

type IntegrationsState = Record<string, IntegrationConfig>;

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  credentialLabel: string;
  credentialType: "text" | "password";
  credentialPlaceholder: string;
}

const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read/write local files and directories",
    credentialLabel: "Root path",
    credentialType: "text",
    credentialPlaceholder: "/home/user/files",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent key-value memory across sessions",
    credentialLabel: "Storage path",
    credentialType: "text",
    credentialPlaceholder: "~/.clawhq/memory",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases",
    credentialLabel: "Connection string",
    credentialType: "password",
    credentialPlaceholder: "postgresql://user:pass@localhost:5432/db",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search via Brave Search API",
    credentialLabel: "API key",
    credentialType: "password",
    credentialPlaceholder: "BSA...",
  },
];

function IntegrationCard({
  def,
  config,
  onChange,
}: {
  def: IntegrationDef;
  config: IntegrationConfig;
  onChange: (patch: Partial<IntegrationConfig>) => void;
}) {
  async function handleTest() {
    onChange({ status: "testing", errorMsg: undefined });
    try {
      const res = await fetch(`/api/integrations/${def.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: config.credential }),
      });
      const data = await res.json() as { ok: boolean; message: string };
      onChange({ status: data.ok ? "ok" : "error", errorMsg: data.ok ? undefined : data.message });
    } catch (err) {
      onChange({ status: "error", errorMsg: String(err) });
    }
  }

  const statusColor =
    config.status === "ok" ? "var(--color-secondary)" :
    config.status === "error" ? "var(--color-error, #ef4444)" :
    "var(--color-text-muted)";

  return (
    <div style={{
      padding: "1rem 1.25rem",
      borderBottom: "1px solid var(--color-border)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: config.enabled ? "0.75rem" : 0 }}>
        {/* Toggle */}
        <button
          onClick={() => onChange({ enabled: !config.enabled, status: "idle", errorMsg: undefined })}
          style={{
            flexShrink: 0,
            width: "2.25rem",
            height: "1.25rem",
            borderRadius: "0.625rem",
            border: "none",
            cursor: "pointer",
            position: "relative",
            background: config.enabled ? "var(--color-primary)" : "var(--color-surface-2)",
            transition: "background 0.15s",
            outline: "1px solid var(--color-border)",
          }}
          aria-label={`${config.enabled ? "Disable" : "Enable"} ${def.name}`}
        >
          <span style={{
            display: "block",
            width: "0.875rem",
            height: "0.875rem",
            borderRadius: "50%",
            background: config.enabled ? "#0e0e10" : "var(--color-text-muted)",
            position: "absolute",
            top: "50%",
            transform: `translateY(-50%) translateX(${config.enabled ? "1.125rem" : "0.125rem"})`,
            transition: "transform 0.15s",
          }} />
        </button>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
            {def.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0 }}>
            {def.description}
          </p>
        </div>

        {/* Status badge */}
        {config.status !== "idle" && (
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: statusColor, flexShrink: 0 }}>
            {config.status === "testing" && <RefreshCw size={12} style={{ display: "inline", verticalAlign: "middle", animation: "spin 1s linear infinite" }} />}
            {config.status === "ok" && <Check size={12} style={{ display: "inline", verticalAlign: "middle" }} />}
            {config.status === "error" && <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} />}
            {" "}
            {config.status === "testing" ? "Testing…" : config.status === "ok" ? "Connected" : "Error"}
          </span>
        )}
      </div>

      {/* Credential field + test button — only when enabled */}
      {config.enabled && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-subtle)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {def.credentialLabel}
            </label>
            <input
              type={def.credentialType}
              value={config.credential}
              onChange={e => onChange({ credential: e.target.value, status: "idle", errorMsg: undefined })}
              placeholder={def.credentialPlaceholder}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "0.8125rem", color: "var(--color-text)" }}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={config.status === "testing" || !config.credential.trim()}
            style={{
              flexShrink: 0,
              padding: "0.5rem 0.875rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: config.status === "testing" || !config.credential.trim() ? "not-allowed" : "pointer",
              opacity: config.status === "testing" || !config.credential.trim() ? 0.45 : 1,
              background: "var(--color-surface-2)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
              transition: "opacity 0.15s",
            }}
          >
            Test
          </button>
        </div>
      )}

      {/* Inline error message */}
      {config.status === "error" && config.errorMsg && (
        <p style={{ fontSize: "0.75rem", marginTop: "0.375rem", color: "var(--color-error, #ef4444)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <AlertTriangle size={11} style={{ flexShrink: 0 }} />
          {config.errorMsg}
        </p>
      )}
    </div>
  );
}

const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = { enabled: false, credential: "", status: "idle" };

function IntegrationsTab() {
  const [state, setState] = useState<IntegrationsState>(() =>
    Object.fromEntries(INTEGRATION_DEFS.map(d => [d.id, { ...DEFAULT_INTEGRATION_CONFIG }]))
  );
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/integrations")
      .then(r => r.json() as Promise<{ integrations: Record<string, { enabled: boolean; credential: string }> }>)
      .then(({ integrations }) => {
        setState(prev => {
          const next = { ...prev };
          for (const [id, entry] of Object.entries(integrations)) {
            next[id] = { ...DEFAULT_INTEGRATION_CONFIG, ...entry };
          }
          return next;
        });
      })
      .catch(() => setLoadError(true));
  }, []);

  function updateConfig(id: string, patch: Partial<IntegrationConfig>) {
    setState(prev => {
      const next = { ...prev, [id]: { ...prev[id]!, ...patch } };
      // Persist enabled + credential changes (not status/errorMsg)
      if ("enabled" in patch || "credential" in patch) {
        const payload: Record<string, { enabled: boolean; credential: string }> = {};
        for (const [integId, cfg] of Object.entries(next)) {
          payload[integId] = { enabled: cfg.enabled, credential: cfg.credential };
        }
        fetch("/api/integrations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => { /* graceful */ });
      }
      return next;
    });
  }

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
            MCP Integrations
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Enable Model Context Protocol servers to extend your agents with external capabilities.
          </p>
          {loadError && (
            <p className="text-xs mt-2" style={{ color: "var(--color-error, #ef4444)" }}>
              <AlertTriangle size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.25rem" }} />
              Could not load saved integrations — changes will still be saved.
            </p>
          )}
        </div>

        {INTEGRATION_DEFS.map(def => (
          <IntegrationCard
            key={def.id}
            def={def}
            config={state[def.id] ?? { ...DEFAULT_INTEGRATION_CONFIG }}
            onChange={patch => updateConfig(def.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Tab: Model Router ──────────────────────────────────────────────────────────

const TASK_TYPES: { id: TaskType; label: string; description: string }[] = [
  { id: "code", label: "Code", description: "Coding, debugging, refactoring, PR review" },
  { id: "research", label: "Research", description: "Web search, analysis, competitor intel" },
  { id: "summary", label: "Summary", description: "Summarize documents, transcripts, threads" },
  { id: "creative", label: "Creative", description: "Writing, newsletters, copy, scripts" },
  { id: "chat", label: "Chat", description: "General conversation and Q&A" },
];

const ALL_MODELS = [
  { id: "anthropic/claude-haiku-4-5", name: "Claude Haiku 4.5", cost: "$", description: "Fastest — summaries & chat" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", cost: "$$", description: "Best balance — code & research" },
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", cost: "$$$", description: "Most capable — creative & complex" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", cost: "$", description: "OpenAI budget tier" },
  { id: "openai/gpt-4o", name: "GPT-4o", cost: "$$", description: "OpenAI balanced tier" },
  { id: "ollama/llama3.2", name: "Llama 3.2 (local)", cost: "free", description: "Local via Ollama — no API cost" },
];

function ModelRouterTab({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const r = settings.modelRouter;
  const patchRouter = (patch: Partial<ModelRouterSettings>) =>
    onChange({ modelRouter: { ...r, ...patch } });

  function toggleLocked(taskId: string) {
    const locked = r.lockedTaskTypes.includes(taskId)
      ? r.lockedTaskTypes.filter(t => t !== taskId)
      : [...r.lockedTaskTypes, taskId];
    patchRouter({ lockedTaskTypes: locked });
  }

  function setTaskOverride(taskId: string, modelId: string) {
    patchRouter({
      taskTypeOverrides: {
        ...r.taskTypeOverrides,
        [taskId]: modelId || undefined as unknown as string,
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Model Router</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Automatically select the best model for each task type. When off, all agents use the primary model.
          </p>
        </div>
        <button
          onClick={() => patchRouter({ enabled: !r.enabled })}
          className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative"
          style={{ background: r.enabled ? "var(--color-primary)" : "var(--color-border-strong)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: r.enabled ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
      </div>

      {r.enabled && (
        <>
          {/* Primary + Fallback models */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Primary Model
              </label>
              <select
                value={r.primaryModel}
                onChange={e => patchRouter({ primaryModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                {ALL_MODELS.filter(m => m.id !== "ollama/llama3.2").map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.cost}) — {m.description}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Budget Fallback Model
              </label>
              <select
                value={r.fallbackModel}
                onChange={e => patchRouter({ fallbackModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                {ALL_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.cost}) — {m.description}</option>
                ))}
              </select>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                Switches to this model when budget exceeds {r.budgetThreshold}%
              </p>
            </div>
          </div>

          {/* Budget threshold slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Budget Fallback Threshold
              </label>
              <span className="text-xs font-mono" style={{ color: "var(--color-primary)" }}>{r.budgetThreshold}%</span>
            </div>
            <input
              type="range" min={50} max={100} step={5}
              value={r.budgetThreshold}
              onChange={e => patchRouter({ budgetThreshold: parseInt(e.target.value) })}
              className="w-full accent-[var(--color-primary)]"
            />
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              Non-critical tasks switch to the fallback model when this % of your monthly budget is consumed.
            </p>
          </div>

          {/* Self-learning toggle */}
          <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Self-Learning</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Track which models perform best per task type and automatically adjust routing over time.
                Requires {r.selfLearningSampleThreshold} samples before taking effect.
              </p>
            </div>
            <button
              onClick={() => patchRouter({ selfLearning: !r.selfLearning })}
              className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5"
              style={{ background: r.selfLearning ? "var(--color-secondary)" : "var(--color-border-strong)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: r.selfLearning ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {/* Ollama toggle */}
          <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Local Ollama Routing</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Route background tasks to a local Ollama model when available — zero API cost.
              </p>
              {r.ollamaEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={r.ollamaBaseUrl}
                    onChange={e => patchRouter({ ollamaBaseUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  />
                  <input
                    type="text"
                    value={r.ollamaModel}
                    onChange={e => patchRouter({ ollamaModel: e.target.value })}
                    placeholder="llama3.2"
                    className="w-24 px-2 py-1 rounded text-xs"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => patchRouter({ ollamaEnabled: !r.ollamaEnabled })}
              className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5"
              style={{ background: r.ollamaEnabled ? "var(--color-accent)" : "var(--color-border-strong)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: r.ollamaEnabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {/* Per-task-type overrides */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Per-Task Overrides</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Pin a specific model to a task type. Overrides self-learning. Lock to prevent self-learning from changing it.
              </p>
            </div>
            {TASK_TYPES.map(task => {
              const override = r.taskTypeOverrides[task.id] ?? "";
              const locked = r.lockedTaskTypes.includes(task.id);
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{task.label}</p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>{task.description}</p>
                  </div>
                  <select
                    value={override}
                    onChange={e => setTaskOverride(task.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", minWidth: 160 }}
                  >
                    <option value="">Auto (router decides)</option>
                    {ALL_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleLocked(task.id)}
                    title={locked ? "Unlock (allow self-learning)" : "Lock (prevent self-learning changes)"}
                    className="p-1.5 rounded"
                    style={{
                      background: locked ? "var(--color-primary-dim)" : "transparent",
                      color: locked ? "var(--color-primary)" : "var(--color-text-subtle)",
                      border: `1px solid ${locked ? "var(--color-primary)" : "var(--color-border)"}`,
                    }}
                  >
                    <Shield size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Packs tab ──────────────────────────────────────────────────────────────────

interface PackMeta {
  id: string;
  name: string;
  description: string;
}

const PACK_CATALOG: Record<string, PackMeta> = {
  "reskilling-core":       { id: "reskilling-core",       name: "Reskilling Core",        description: "6 agents + workflows for workforce augmentation and AI reskilling programs." },
  "augmented-engineering": { id: "augmented-engineering", name: "Augmented Engineering",   description: "Engineering team agents — code review, incident response, sprint planning." },
  "augmented-finance":     { id: "augmented-finance",     name: "Augmented Finance",       description: "Finance and compliance agents — reporting, anomaly detection, forecasting." },
  "augmented-sales":       { id: "augmented-sales",       name: "Augmented Sales",         description: "Sales team agents — lead qualification, pipeline review, outreach drafting." },
  "augmented-support":     { id: "augmented-support",     name: "Augmented Support",       description: "Customer support agents — triage, response drafting, escalation routing." },
  "creator-suite":         { id: "creator-suite",         name: "Creator Suite",           description: "12-agent content system — scripting, scheduling, repurposing, analytics." },
  "marketing-agency":      { id: "marketing-agency",      name: "Marketing Agency",        description: "Content strategy, copywriting, SEO, social scheduling, and client reporting agents." },
  "real-estate":           { id: "real-estate",           name: "Real Estate",             description: "Listing copy, lead follow-up, market research, offer strategy, and open house prep agents." },
  "ecommerce":             { id: "ecommerce",             name: "E-commerce",              description: "Product copy, review responses, competitor pricing, inventory alerts, and cart recovery agents." },
  "trades-library":        { id: "trades-library",        name: "Trades Library",          description: "Agents and workflows for skilled trades businesses and field service teams." },
};

function PacksTab() {
  const [licenseKey, setLicenseKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>([]);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [keyEmail, setKeyEmail] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("clawhq_pack_license");
    if (stored) {
      const parsed = JSON.parse(stored) as { key: string; packs: string[]; email: string };
      setSavedKey(parsed.key);
      setLicenseKey(parsed.key);
      setUnlockedPacks(parsed.packs);
      setKeyEmail(parsed.email);
    }
    fetch("/api/packs/install").then(r => r.json()).then((d: { packs: string[] }) => setInstalledPacks(d.packs ?? []));
  }, []);

  async function validateKey() {
    const key = licenseKey.trim().toUpperCase();
    if (!key) return;
    setValidating(true);
    setKeyError(null);
    try {
      const res = await fetch("/api/packs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json() as { valid: boolean; packs?: string[]; email?: string };
      if (!data.valid) {
        setKeyError("Invalid license key. Check your purchase confirmation email.");
        setUnlockedPacks([]);
        setSavedKey(null);
        localStorage.removeItem("clawhq_pack_license");
      } else {
        const packs = data.packs ?? [];
        setUnlockedPacks(packs);
        setKeyEmail(data.email ?? null);
        setSavedKey(key);
        localStorage.setItem("clawhq_pack_license", JSON.stringify({ key, packs, email: data.email ?? "" }));
        toast.success("License key activated");
      }
    } catch {
      setKeyError("Could not reach the pack registry. Check your connection.");
    } finally {
      setValidating(false);
    }
  }

  async function installPack(packId: string) {
    if (!savedKey) return;
    setInstalling(packId);
    try {
      const res = await fetch("/api/packs/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: savedKey, packId }),
      });
      if (!res.ok) throw new Error();
      setInstalledPacks(p => [...p, packId]);
      toast.success(`${PACK_CATALOG[packId]?.name ?? packId} installed`);
    } catch {
      toast.error("Failed to install pack. Try again.");
    } finally {
      setInstalling(null);
    }
  }

  async function removePack(packId: string) {
    setRemoving(packId);
    try {
      await fetch("/api/packs/install", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      setInstalledPacks(p => p.filter(id => id !== packId));
      toast.success("Pack removed");
    } catch {
      toast.error("Failed to remove pack.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">

      {/* License key section */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>License Key</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Enter the key from your purchase confirmation email to unlock packs.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-subtle)" }} />
            <input
              value={licenseKey}
              onChange={e => { setLicenseKey(e.target.value.toUpperCase()); setKeyError(null); }}
              onKeyDown={e => e.key === "Enter" && validateKey()}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full pl-8 pr-4 py-2 rounded-lg text-sm font-mono"
              style={{ background: "var(--color-surface)", border: `1px solid ${keyError ? "#ef4444" : "var(--color-border)"}`, color: "var(--color-text)" }}
            />
          </div>
          <button
            onClick={validateKey}
            disabled={validating || !licenseKey.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: "var(--color-primary)", color: "#000", opacity: validating ? 0.6 : 1 }}
          >
            {validating ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            Activate
          </button>
        </div>

        {keyError && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "#ef4444" }}>
            <AlertTriangle size={12} /> {keyError}
          </p>
        )}
        {savedKey && keyEmail && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-primary)" }}>
            <Check size={12} /> Active — licensed to {keyEmail}
          </p>
        )}
      </div>

      {/* Unlocked packs */}
      {unlockedPacks.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Your Packs <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}>{unlockedPacks.length}</span>
          </p>
          <div className="space-y-2">
            {unlockedPacks.map(packId => {
              const meta = PACK_CATALOG[packId] ?? { id: packId, name: packId, description: "" };
              const isInstalled = installedPacks.includes(packId);
              const isInstalling = installing === packId;
              const isRemoving = removing === packId;
              return (
                <div key={packId} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div className="mt-0.5 p-1.5 rounded-lg" style={{ background: "var(--color-primary-dim)" }}>
                    <Package size={14} style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{meta.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{meta.description}</p>
                  </div>
                  {isInstalled ? (
                    <button
                      onClick={() => removePack(packId)}
                      disabled={isRemoving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      {isRemoving ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => installPack(packId)}
                      disabled={isInstalling}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}
                    >
                      {isInstalling ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                      Install
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state — no key yet */}
      {unlockedPacks.length === 0 && !savedKey && (
        <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl text-center"
          style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-border)" }}>
          <Package size={28} style={{ color: "var(--color-text-subtle)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No packs unlocked</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Purchase a pack to unlock vertical-specific agent bundles for your team.
            </p>
          </div>
          <a
            href="https://clawhqplatform.com/packs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-lg font-medium"
            style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}
          >
            Browse packs →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "general", label: "General", icon: Sliders },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "channels", label: "Channels", icon: Zap },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "router", label: "Model Router", icon: Sparkles },
  { id: "packs", label: "Packs", icon: Package },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Partial<Settings> | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardChannel, setWizardChannel] = useState<ChannelId>("discord");

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => { setSettings(d); setSaved(d); })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  function patch(p: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...p }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const updated = await res.json();
      setSaved(updated);
      setSettings(updated);
    } catch { /* graceful */ }
    finally { setSaving(false); }
  }

  function discard() { setSettings(saved); }

  function applyProposal() {
    if (!proposal) return;
    setSettings(prev => ({
      ...prev,
      ...proposal,
      agents: { ...prev.agents, ...(proposal.agents ?? {}) },
      providerCaps: { ...prev.providerCaps, ...(proposal.providerCaps ?? {}) },
    }));
    setProposal(null);
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <ChannelWizard open={wizardOpen} defaultChannel={wizardChannel} onClose={() => setWizardOpen(false)} />

      <div className="max-w-3xl animate-fade-in">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "var(--color-surface-2)" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-text-muted)",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}>
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* AI proposal banner */}
        {proposal && (
          <ProposalBanner diff={proposal} onAccept={applyProposal} onReject={() => setProposal(null)} />
        )}

        {/* Tab content */}
        {activeTab === "general" && <GeneralTab settings={settings} onChange={patch} />}
        {activeTab === "agents" && <AgentsTab settings={settings} onChange={patch} />}
        {activeTab === "channels" && <ChannelsTab onOpenWizard={ch => { setWizardChannel(ch); setWizardOpen(true); }} />}
        {activeTab === "budget" && <BudgetTab settings={settings} onChange={patch} />}
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "router" && <ModelRouterTab settings={settings} onChange={patch} />}
        {activeTab === "packs" && <PacksTab />}

        {/* NL input (not shown on channels/integrations/router/packs tabs since they don't affect general settings) */}
        {activeTab !== "channels" && activeTab !== "integrations" && activeTab !== "router" && activeTab !== "packs" && (
          <div className="mt-6">
            <NaturalLanguageInput currentSettings={settings} onPropose={setProposal} />
          </div>
        )}
      </div>

      <UnsavedBar dirty={dirty} saving={saving} onSave={saveSettings} onDiscard={discard} />
    </>
  );
}
