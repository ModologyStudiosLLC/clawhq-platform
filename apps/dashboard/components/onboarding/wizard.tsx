"use client";

import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Cpu, Wifi } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Goal = "research" | "leads" | "content" | "automation" | "custom";
type AgentId = "felix" | "scout" | "codex" | "pixel" | "scribe" | "fixer";
type Provider = "openrouter" | "anthropic" | "openai" | "ollama";

// ── Data ──────────────────────────────────────────────────────────────────────

const GOALS: { id: Goal; emoji: string; label: string; desc: string }[] = [
  { id: "research",   emoji: "🔭", label: "Research",         desc: "Deep dives, competitive intel, market analysis" },
  { id: "leads",      emoji: "📊", label: "Lead generation",  desc: "Find and qualify prospects automatically" },
  { id: "content",    emoji: "✍️", label: "Content",          desc: "Writing, social posts, email sequences" },
  { id: "automation", emoji: "⚡", label: "Automation",       desc: "Schedule tasks, monitor targets, alert me" },
  { id: "custom",     emoji: "🎯", label: "Something else",   desc: "I'll set it up myself" },
];

const AGENTS: {
  id: AgentId;
  name: string;
  role: string;
  emoji: string;
  desc: string;
  defaultActive: boolean;
}[] = [
  {
    id: "felix",
    name: "Mike",
    role: "CEO",
    emoji: "🦁",
    desc: "Your lead agent. Delegates tasks, coordinates the team, and answers anything you throw at it.",
    defaultActive: true,
  },
  {
    id: "scout",
    name: "Scout",
    role: "Research",
    emoji: "🔭",
    desc: "Deep research, competitive intelligence, topic monitoring, and market analysis.",
    defaultActive: true,
  },
  {
    id: "codex",
    name: "Codex",
    role: "Engineering",
    emoji: "⚙️",
    desc: "Writes, reviews, and debugs code. Handles technical implementation and architecture.",
    defaultActive: false,
  },
  {
    id: "pixel",
    name: "Pixel",
    role: "Design & Brand",
    emoji: "🎨",
    desc: "Brand voice, copy direction, visual guidance, and creative output.",
    defaultActive: false,
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "Content",
    emoji: "✍️",
    desc: "Emails, blog posts, social content, newsletters, and long-form writing.",
    defaultActive: false,
  },
  {
    id: "fixer",
    name: "Fixer",
    role: "QA & Debug",
    emoji: "🔧",
    desc: "Finds bugs, traces errors, and fixes broken workflows across your systems.",
    defaultActive: false,
  },
];

const STEPS = ["welcome", "goal", "agents", "apikey", "channel", "done"] as const;
type Step = typeof STEPS[number];

// ── Wizard ────────────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep]       = useState<Step>("welcome");
  const [goals, setGoals]     = useState<Goal[]>([]);
  const [activeAgents, setActiveAgents] = useState<AgentId[]>(
    AGENTS.filter(a => a.defaultActive).map(a => a.id)
  );
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [apiKey, setApiKey]   = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving]   = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress  = (stepIndex / (STEPS.length - 1)) * 100;

  function toggleGoal(g: Goal) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  function toggleAgent(id: AgentId) {
    // Mike is always required — can't be deselected
    if (id === "felix") return;
    setActiveAgents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function saveApiKey() {
    if (provider === "ollama" || !apiKey.trim()) { next(); return; }
    setSaving(true);
    localStorage.setItem("clawhq_provider", provider);
    localStorage.setItem("clawhq_api_key", apiKey);
    try {
      await fetch("/api/openfang/api/config/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: apiKey }),
      });
    } catch { /* silent */ }
    setSaving(false);
    next();
  }

  async function activateGoalCapabilities(selectedGoals: Goal[]) {
    const GOAL_HANDS: Record<Goal, string[]> = {
      research:   ["web-search-hand", "browser-hand", "research-hand"],
      leads:      ["web-search-hand", "browser-hand", "lead-gen-hand"],
      content:    ["web-search-hand", "content-hand", "writer-hand"],
      automation: ["scheduler-hand", "webhook-hand", "automation-hand"],
      custom:     [],
    };
    const handsToEnable = [...new Set(selectedGoals.flatMap(g => GOAL_HANDS[g]))];
    await Promise.allSettled(
      handsToEnable.map(handId =>
        fetch(`/api/openfang/api/hands/${handId}/enable`, { method: "POST" })
      )
    );
  }

  async function activateAgents(agentIds: AgentId[]) {
    await Promise.allSettled(
      agentIds.map(id =>
        fetch(`/api/openclaw/agents/${id}/enable`, { method: "POST" })
      )
    );
  }

  function next() {
    if (step === "goal")   activateGoalCapabilities(goals);
    if (step === "agents") activateAgents(activeAgents);
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    else window.location.href = "/home";
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  const Btn = ({ onClick, disabled, children }: {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
      style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "var(--color-on-brand)" }}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-md">
      {/* Progress bar */}
      {step !== "welcome" && step !== "done" && (
        <div className="h-0.5 rounded-full mb-8 overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
          />
        </div>
      )}

      {/* ── Welcome ── */}
      {step === "welcome" && (
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-8"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "var(--color-on-brand)",
              fontFamily: "var(--font-display)",
            }}
          >
            C
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Welcome to ClawHQ
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
            Your AI agent team. Works with Claude, GPT-4, Gemini, DeepSeek, local
            Llama — you choose the model. Researches, generates leads, writes
            content, and automates your work.
          </p>
          <button
            onClick={next}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "var(--color-on-brand)" }}
          >
            Get started <ArrowRight size={15} />
          </button>
          <p className="text-xs mt-4" style={{ color: "var(--color-text-subtle)" }}>Takes about 2 minutes</p>
        </div>
      )}

      {/* ── Goal ── */}
      {step === "goal" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            What do you want agents to do?
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Pick everything that applies. You can always add more later.
          </p>
          <div className="space-y-2 mb-6">
            {GOALS.map(g => {
              const selected = goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: selected ? "var(--color-primary-dim)" : "var(--color-surface)",
                    border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                  }}
                >
                  <span className="text-xl w-8 text-center flex-shrink-0">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{g.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{g.desc}</p>
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--color-primary)" }}>
                      <Check size={11} color="var(--color-on-brand)" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>Back</button>
            <Btn onClick={next} disabled={goals.length === 0}>Continue <ArrowRight size={14} /></Btn>
          </div>
        </div>
      )}

      {/* ── Agents ── */}
      {step === "agents" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Choose your starting team
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Mike is always on. Pick any others to activate — you can add or remove agents anytime.
          </p>
          <div className="space-y-2 mb-6">
            {AGENTS.map(agent => {
              const selected = activeAgents.includes(agent.id);
              const locked   = agent.id === "felix";
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  disabled={locked}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all disabled:cursor-default"
                  style={{
                    background: selected ? "var(--color-primary-dim)" : "var(--color-surface)",
                    border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                    opacity: locked ? 1 : undefined,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      background: selected ? "var(--color-primary-dim)" : "var(--color-surface-2)",
                      border: `1px solid ${selected ? "color-mix(in srgb, var(--color-primary) 30%, transparent)" : "var(--color-border)"}`,
                    }}
                  >
                    {agent.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{agent.name}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--color-surface-2)",
                          color: "var(--color-text-subtle)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {agent.role}
                      </span>
                      {locked && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}
                        >
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{agent.desc}</p>
                  </div>

                  {/* Check */}
                  {selected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: locked ? "var(--color-secondary)" : "var(--color-primary)" }}
                    >
                      <Check size={11} color="var(--color-on-brand)" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>Back</button>
            <Btn onClick={next}>
              Activate {activeAgents.length} agent{activeAgents.length !== 1 ? "s" : ""} <ArrowRight size={14} />
            </Btn>
          </div>
        </div>
      )}

      {/* ── API Key / Provider ── */}
      {step === "apikey" && (() => {
        const PROVIDERS: {
          id: Provider;
          label: string;
          tagline: string;
          tag?: string;
          tagColor?: string;
          placeholder: string;
          showKey: boolean;
          keyLabel: string;
          helpUrl?: string;
          helpText?: string;
        }[] = [
          {
            id: "openrouter",
            label: "OpenRouter",
            tagline: "One key — Claude, GPT-4, Gemini, DeepSeek, Llama, and 50+ more",
            tag: "Recommended",
            tagColor: "var(--color-secondary)",
            placeholder: "sk-or-...",
            showKey: true,
            keyLabel: "API key",
            helpUrl: "https://openrouter.ai/keys",
            helpText: "Get a free key at openrouter.ai",
          },
          {
            id: "anthropic",
            label: "Anthropic (Claude)",
            tagline: "Direct access to Claude Haiku, Sonnet, and Opus",
            placeholder: "sk-ant-...",
            showKey: true,
            keyLabel: "API key",
            helpUrl: "https://console.anthropic.com",
            helpText: "console.anthropic.com",
          },
          {
            id: "openai",
            label: "OpenAI",
            tagline: "GPT-4o, GPT-4o mini, and o1 models",
            placeholder: "sk-...",
            showKey: true,
            keyLabel: "API key",
            helpUrl: "https://platform.openai.com/api-keys",
            helpText: "platform.openai.com",
          },
          {
            id: "ollama",
            label: "Local (Ollama)",
            tagline: "Run Llama, Mistral, Qwen, and more — no API costs, fully private",
            tag: "Free",
            tagColor: "var(--color-primary)",
            placeholder: "",
            showKey: false,
            keyLabel: "",
          },
        ];

        const selected = PROVIDERS.find(p => p.id === provider)!;

        return (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Choose your AI provider
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              ClawHQ works with any provider. You can switch or add more in Settings at any time.
            </p>

            {/* Provider cards */}
            <div className="space-y-2 mb-5">
              {PROVIDERS.map(p => {
                const active = provider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id); setApiKey(""); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: active ? "var(--color-primary-dim)" : "var(--color-surface)",
                      border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? "var(--color-primary-dim)" : "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                    >
                      {p.id === "ollama" ? <Cpu size={14} style={{ color: active ? "var(--color-primary)" : "var(--color-text-muted)" }} /> : <Wifi size={14} style={{ color: active ? "var(--color-primary)" : "var(--color-text-muted)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{p.label}</span>
                        {p.tag && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `color-mix(in srgb, ${p.tagColor} 15%, transparent)`, color: p.tagColor }}>
                            {p.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{p.tagline}</p>
                    </div>
                    {active && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary)" }}>
                        <Check size={9} color="var(--color-on-brand)" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Key input — hidden for Ollama */}
            {selected.showKey && (
              <div className="mb-4">
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl mb-1.5"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {selected.keyLabel}
                  </span>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveApiKey(); }}
                    placeholder={selected.placeholder}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--color-text)" }}
                  />
                  <button onClick={() => setShowKey(v => !v)} style={{ color: "var(--color-text-muted)" }}>
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {selected.helpText && (
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    Stored locally, never sent to Modology.{" "}
                    {selected.helpUrl && (
                      <a href={selected.helpUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                        {selected.helpText} →
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}

            {provider === "ollama" && (
              <p className="text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ background: "var(--color-primary-dim)", color: "var(--color-text-muted)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)" }}>
                Make sure <strong style={{ color: "var(--color-text)" }}>Ollama</strong> is running on your machine at{" "}
                <code style={{ color: "var(--color-primary)" }}>localhost:11434</code>. You can pull models with{" "}
                <code style={{ color: "var(--color-primary)" }}>ollama pull llama3.2</code>.
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>Back</button>
              <Btn onClick={saveApiKey} disabled={saving}>
                {saving ? "Saving..." : (provider === "ollama" || apiKey) ? "Continue" : "Skip for now"} <ArrowRight size={14} />
              </Btn>
            </div>
          </div>
        );
      })()}

      {/* ── Channel ── */}
      {step === "channel" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Where do you want to talk to your agents?
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Connect a channel or use ClawHQ&apos;s built-in chat. You can add more in Settings later.
          </p>
          <div className="space-y-2 mb-6">
            {[
              { emoji: "💬", label: "ClawHQ Chat",  desc: "Use the built-in interface right here", tag: "Recommended", action: next },
              { emoji: "🎮", label: "Discord",       desc: "Talk to agents in your Discord server",   action: () => { window.location.href = "/channels"; } },
              { emoji: "🟣", label: "Slack",         desc: "Use agents inside your workspace",        action: () => { window.location.href = "/channels"; } },
              { emoji: "✈️", label: "Telegram",      desc: "Message agents on Telegram",              action: () => { window.location.href = "/channels"; } },
            ].map(ch => (
              <button
                key={ch.label}
                onClick={ch.action}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <span className="text-xl w-8 text-center flex-shrink-0">{ch.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{ch.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{ch.desc}</p>
                </div>
                {ch.tag && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}
                  >
                    {ch.tag}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>Back</button>
            <button
              onClick={next}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-center"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--color-secondary-dim)" }}
          >
            <Check size={28} style={{ color: "var(--color-secondary)" }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Your team is ready
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
            {activeAgents.length} agent{activeAgents.length !== 1 ? "s" : ""} activated and standing by.
            Head to your dashboard to get started.
          </p>
          <div className="flex justify-center gap-1.5 mb-8 flex-wrap">
            {activeAgents.map(id => {
              const a = AGENTS.find(x => x.id === id)!;
              return (
                <span
                  key={id}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)" }}
                >
                  {a.emoji} {a.name}
                </span>
              );
            })}
          </div>
          <button
            onClick={() => {
              document.cookie = "clawhq_setup=1; path=/; max-age=31536000";
              window.location.href = "/home";
            }}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "var(--color-on-brand)" }}
          >
            Go to dashboard <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
