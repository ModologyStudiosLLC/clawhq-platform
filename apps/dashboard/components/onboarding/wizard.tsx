"use client";

import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";

type Goal = "research" | "leads" | "content" | "automation" | "custom";

const GOALS: { id: Goal; emoji: string; label: string; desc: string }[] = [
  { id: "research", emoji: "🔭", label: "Research", desc: "Deep dives, competitive intel, market analysis" },
  { id: "leads", emoji: "📊", label: "Lead generation", desc: "Find and qualify prospects automatically" },
  { id: "content", emoji: "✍️", label: "Content", desc: "Writing, social posts, email sequences" },
  { id: "automation", emoji: "⚡", label: "Automation", desc: "Schedule tasks, monitor targets, alert me" },
  { id: "custom", emoji: "🎯", label: "Something else", desc: "I'll set it up myself" },
];

const STEPS = ["welcome", "goal", "apikey", "channel", "done"] as const;
type Step = typeof STEPS[number];

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>("welcome");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  function toggleGoal(g: Goal) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function saveApiKey() {
    if (!apiKey.trim()) { next(); return; }
    setSaving(true);
    // Save to localStorage for now — settings page will handle proper storage
    localStorage.setItem("clawhq_anthropic_key", apiKey);
    setSaving(false);
    next();
  }

  function next() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    else window.location.href = "/home";
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  return (
    <div className="w-full max-w-md">
      {/* Progress */}
      {step !== "welcome" && step !== "done" && (
        <div className="h-0.5 rounded-full mb-8 overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
          />
        </div>
      )}

      {/* Welcome */}
      {step === "welcome" && (
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-8"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "#0e0e10",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            C
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
            Welcome to ClawHQ
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
            Your AI agent team. Researches, generates leads, writes content, and
            automates your work — while you focus on what matters.
          </p>
          <button
            onClick={next}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
          >
            Get started <ArrowRight size={15} />
          </button>
          <p className="text-xs mt-4" style={{ color: "var(--color-text-subtle)" }}>
            Takes about 2 minutes
          </p>
        </div>
      )}

      {/* Goal selection */}
      {step === "goal" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
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
                      <Check size={11} color="#0e0e10" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>
              Back
            </button>
            <button
              onClick={next}
              disabled={goals.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* API Key */}
      {step === "apikey" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
            Add your Anthropic key
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            This powers your agents. Get one at console.anthropic.com — it takes 30 seconds.
          </p>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--color-text)" }}
            />
            <button onClick={() => setShowKey(v => !v)} style={{ color: "var(--color-text-muted)" }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs mb-6" style={{ color: "var(--color-text-subtle)" }}>
            Stored locally. Never sent to Modology servers.
          </p>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>
              Back
            </button>
            <button
              onClick={saveApiKey}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
            >
              {saving ? "Saving..." : apiKey ? "Continue" : "Skip for now"} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Channel */}
      {step === "channel" && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
            Where do you want to talk to your agents?
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Connect a channel or use ClawHQ&apos;s built-in chat. You can add more later.
          </p>
          <div className="space-y-2 mb-6">
            {[
              { emoji: "💬", label: "ClawHQ Chat", desc: "Use the built-in interface right here", available: true },
              { emoji: "🎮", label: "Discord", desc: "Talk to agents in your Discord server", available: true },
              { emoji: "💼", label: "Slack", desc: "Use agents inside your workspace", available: true },
              { emoji: "✈️", label: "Telegram", desc: "Message agents on Telegram", available: true },
            ].map(ch => (
              <button
                key={ch.label}
                onClick={ch.label === "ClawHQ Chat" ? next : undefined}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <span className="text-xl w-8 text-center flex-shrink-0">{ch.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{ch.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{ch.desc}</p>
                </div>
                {ch.label === "ClawHQ Chat" && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}>
                    Recommended
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={back} className="px-4 py-3 rounded-xl text-sm" style={{ color: "var(--color-text-muted)" }}>
              Back
            </button>
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

      {/* Done */}
      {step === "done" && (
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--color-secondary-dim)" }}
          >
            <Check size={28} style={{ color: "var(--color-secondary)" }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
            Your team is ready
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
            Your agents are standing by. Head to your dashboard to get started.
          </p>
          <button
            onClick={() => {
              document.cookie = "clawhq_setup=1; path=/; max-age=31536000";
              window.location.href = "/home";
            }}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
          >
            Go to dashboard <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
