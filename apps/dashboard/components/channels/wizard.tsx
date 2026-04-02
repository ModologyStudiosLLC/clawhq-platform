"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChannelId = "discord" | "telegram" | "slack";

interface ChannelWizardProps {
  open: boolean;
  defaultChannel?: ChannelId;
  onClose: () => void;
  onSaved?: (channel: ChannelId) => void;
}

interface Step {
  title: string;
  body: React.ReactNode;
}

// ── Copy button helper ────────────────────────────────────────────────────────

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-xs transition-all"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: copied ? "var(--color-secondary)" : "var(--color-text-muted)",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{text}</span>
    </button>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
      style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}
    >
      {n}
    </span>
  );
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <StepNum n={n} />
      <div className="flex-1 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {children}
      </div>
    </div>
  );
}

function ExternalBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-1.5 transition-all"
      style={{
        background: "var(--color-primary-dim)",
        border: "1px solid rgba(105,218,255,0.25)",
        color: "var(--color-primary)",
      }}
    >
      {label}
      <ExternalLink size={11} />
    </a>
  );
}

// ── Channel configs ───────────────────────────────────────────────────────────

const CHANNELS: Record<ChannelId, { label: string; icon: string; color: string; dim: string; tokenLabel: string; tokenPlaceholder: string; steps: Step[] }> = {
  discord: {
    label: "Discord",
    icon: "💬",
    color: "#5865F2",
    dim: "rgba(88,101,242,0.12)",
    tokenLabel: "Bot Token",
    tokenPlaceholder: "MTxxxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxx",
    steps: [
      {
        title: "Create a Discord Application",
        body: (
          <StepRow n={1}>
            Go to the Discord Developer Portal and create a new application.
            <div className="mt-2">
              <ExternalBtn href="https://discord.com/developers/applications" label="Open Developer Portal" />
            </div>
          </StepRow>
        ),
      },
      {
        title: "Add a Bot",
        body: (
          <div className="space-y-0.5">
            <StepRow n={2}>
              In your application, click <strong className="text-white">Bot</strong> in the left sidebar, then <strong className="text-white">Add Bot</strong>.
            </StepRow>
            <StepRow n={3}>
              Under <strong className="text-white">Privileged Gateway Intents</strong>, enable both{" "}
              <strong className="text-white">Message Content Intent</strong> and{" "}
              <strong className="text-white">Server Members Intent</strong>.
            </StepRow>
            <StepRow n={4}>
              Click <strong className="text-white">Reset Token</strong> → confirm → copy the token.
            </StepRow>
          </div>
        ),
      },
      {
        title: "Invite the bot to your server",
        body: (
          <div className="space-y-0.5">
            <StepRow n={5}>
              Go to <strong className="text-white">OAuth2 → URL Generator</strong>.
            </StepRow>
            <StepRow n={6}>
              Under <strong className="text-white">Scopes</strong>, select <CopySnippet text="bot" /> and <CopySnippet text="applications.commands" />.
            </StepRow>
            <StepRow n={7}>
              Under <strong className="text-white">Bot Permissions</strong>, select: <em>Send Messages, Read Message History, View Channels, Use Slash Commands</em>.
            </StepRow>
            <StepRow n={8}>
              Copy the generated URL, open it in your browser, and add the bot to your server.
            </StepRow>
          </div>
        ),
      },
    ],
  },

  telegram: {
    label: "Telegram",
    icon: "✈️",
    color: "#26A5E4",
    dim: "rgba(38,165,228,0.12)",
    tokenLabel: "Bot Token",
    tokenPlaceholder: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    steps: [
      {
        title: "Talk to @BotFather",
        body: (
          <StepRow n={1}>
            Open Telegram and start a conversation with <CopySnippet text="@BotFather" />.
            <div className="mt-2">
              <ExternalBtn href="https://t.me/BotFather" label="Open BotFather" />
            </div>
          </StepRow>
        ),
      },
      {
        title: "Create your bot",
        body: (
          <div className="space-y-0.5">
            <StepRow n={2}>
              Send the command <CopySnippet text="/newbot" /> to BotFather.
            </StepRow>
            <StepRow n={3}>
              Choose a display name for your bot (e.g. <em>My ClawHQ Agent</em>).
            </StepRow>
            <StepRow n={4}>
              Choose a username ending in <strong className="text-white">bot</strong> (e.g. <em>my_clawhq_bot</em>).
            </StepRow>
            <StepRow n={5}>
              BotFather will reply with your bot token — copy it.
            </StepRow>
          </div>
        ),
      },
      {
        title: "Optional: Allow groups",
        body: (
          <StepRow n={6}>
            If you want the bot in group chats, send <CopySnippet text="/setjoingroups" /> to BotFather and enable it for your bot.
          </StepRow>
        ),
      },
    ],
  },

  slack: {
    label: "Slack",
    icon: "🟣",
    color: "#4A154B",
    dim: "rgba(74,21,75,0.18)",
    tokenLabel: "Bot OAuth Token",
    tokenPlaceholder: "xoxb-0000000000000-0000000000000-xxxxxxxxxxxxxxxxxxxxxxxx",
    steps: [
      {
        title: "Create a Slack App",
        body: (
          <StepRow n={1}>
            Go to the Slack API portal and create a new app <strong className="text-white">From scratch</strong>.
            Give it a name and select your workspace.
            <div className="mt-2">
              <ExternalBtn href="https://api.slack.com/apps?new_app=1" label="Create Slack App" />
            </div>
          </StepRow>
        ),
      },
      {
        title: "Add OAuth scopes",
        body: (
          <div className="space-y-0.5">
            <StepRow n={2}>
              Under <strong className="text-white">OAuth & Permissions → Bot Token Scopes</strong>, add these scopes:
            </StepRow>
            <div className="flex flex-wrap gap-1.5 ml-8 mt-1 mb-1">
              {["chat:write", "channels:history", "app_mentions:read", "channels:read", "im:history", "im:read", "im:write"].map(s => (
                <CopySnippet key={s} text={s} />
              ))}
            </div>
          </div>
        ),
      },
      {
        title: "Enable Socket Mode & Event Subscriptions",
        body: (
          <div className="space-y-0.5">
            <StepRow n={3}>
              Under <strong className="text-white">Socket Mode</strong>, toggle it on and create an App-Level Token with <CopySnippet text="connections:write" /> scope.
            </StepRow>
            <StepRow n={4}>
              Under <strong className="text-white">Event Subscriptions</strong>, enable events and subscribe to:{" "}
              <CopySnippet text="message.channels" />{" "}<CopySnippet text="app_mention" />{" "}<CopySnippet text="message.im" />.
            </StepRow>
          </div>
        ),
      },
      {
        title: "Install and copy token",
        body: (
          <div className="space-y-0.5">
            <StepRow n={5}>
              Go back to <strong className="text-white">OAuth & Permissions</strong> and click <strong className="text-white">Install to Workspace</strong>.
            </StepRow>
            <StepRow n={6}>
              After authorizing, copy the <strong className="text-white">Bot User OAuth Token</strong> — it starts with <CopySnippet text="xoxb-" />.
            </StepRow>
          </div>
        ),
      },
    ],
  },
};

// ── Token input step ──────────────────────────────────────────────────────────

function TokenInput({
  channel,
  onSaved,
}: {
  channel: ChannelId;
  onSaved: () => void;
}) {
  const cfg = CHANNELS[channel];
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!token.trim()) { setError("Token is required."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/openclaw/config/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, token: token.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save — check that OpenClaw is running.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          {cfg.tokenLabel}
        </label>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "var(--color-surface-2)", border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}` }}
        >
          <input
            type={show ? "text" : "password"}
            value={token}
            onChange={e => { setToken(e.target.value); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            placeholder={cfg.tokenPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none font-mono"
            style={{ color: "var(--color-text)" }}
            autoFocus
          />
          <button onClick={() => setShow(v => !v)} style={{ color: "var(--color-text-muted)" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{error}</p>}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !token.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Saving…</>
        ) : (
          <>Save & activate <Check size={14} /></>
        )}
      </button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function ChannelWizard({ open, defaultChannel = "discord", onClose, onSaved }: ChannelWizardProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelId>(defaultChannel);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync when caller changes defaultChannel
  useEffect(() => {
    if (open) {
      setActiveChannel(defaultChannel);
      setStepIdx(0);
      setDone(false);
    }
  }, [open, defaultChannel]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cfg = CHANNELS[activeChannel];
  const steps = cfg.steps;
  const isLast = stepIdx === steps.length - 1;

  const channels: ChannelId[] = ["discord", "telegram", "slack"];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-strong)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}>
                Connect {cfg.label}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                {done ? "All done!" : `Step ${stepIdx + 1} of ${steps.length + 1}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0">
          {channels.map(ch => {
            const c = CHANNELS[ch];
            const active = ch === activeChannel;
            return (
              <button
                key={ch}
                onClick={() => { setActiveChannel(ch); setStepIdx(0); setDone(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? c.dim : "transparent",
                  border: `1px solid ${active ? `${c.color}44` : "transparent"}`,
                  color: active ? c.color : "var(--color-text-muted)",
                }}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-3">
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: done ? "100%" : `${((stepIdx + 1) / (steps.length + 1)) * 100}%`,
                background: `linear-gradient(90deg, ${cfg.color}, var(--color-secondary))`,
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {done ? (
            <div className="text-center py-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--color-secondary-dim)" }}
              >
                <Check size={24} style={{ color: "var(--color-secondary)" }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif", color: "var(--color-text)" }}>
                {cfg.label} connected!
              </h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Your agents will now respond to messages in {cfg.label}. It may take a moment for the connection to go live.
              </p>
            </div>
          ) : stepIdx < steps.length ? (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}>
                {steps[stepIdx].title}
              </h3>
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                {steps[stepIdx].body}
              </div>
            </div>
          ) : (
            // Final step: token input
            <div className="space-y-1">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}>
                Paste your token
              </h3>
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                <TokenInput
                  channel={activeChannel}
                  onSaved={() => {
                    setDone(true);
                    onSaved?.(activeChannel);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!done && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={() => setStepIdx(v => Math.max(0, v - 1))}
              disabled={stepIdx === 0}
              className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
              style={{ color: "var(--color-text-muted)" }}
            >
              Back
            </button>

            {stepIdx < steps.length ? (
              <button
                onClick={() => setStepIdx(v => v + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "var(--color-primary-dim)", border: "1px solid rgba(105,218,255,0.3)", color: "var(--color-primary)" }}
              >
                {isLast ? "Add token" : "Next"}
                <ArrowRight size={14} />
              </button>
            ) : null}
          </div>
        )}

        {done && (
          <div className="flex justify-center px-6 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#0e0e10" }}
            >
              Back to Channels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
