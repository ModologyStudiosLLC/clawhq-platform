"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Clock,
  Cpu,
} from "lucide-react";

interface HermesStatus {
  ok: boolean;
  gateway: { running: boolean; pids: string[] };
  model: string;
  channels: string[];
  sessions: number;
  started_at: string;
}

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  telegram: { label: "Telegram", color: "var(--color-primary)" },
  discord: { label: "Discord", color: "#5865f2" },
  slack: { label: "Slack", color: "var(--color-accent)" },
};

const MODEL_DISPLAY: Record<string, string> = {
  "anthropic/claude-opus-4-6": "Claude Opus 4.6",
  "anthropic/claude-sonnet-4-6": "Claude Sonnet 4.6",
  "anthropic/claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4o-mini": "GPT-4o mini",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function HermesPanel() {
  const [status, setStatus] = useState<HermesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/hermes/status");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refresh = () => { setRefreshing(true); load(); };

  const isRunning = status?.gateway?.running ?? false;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Hero card */}
      <div
        className="card p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-accent-dim) 0%, var(--color-surface) 60%)",
          borderColor: "color-mix(in srgb, var(--color-accent) 20%, transparent)",
        }}
      >
        {/* Ambient orb */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--color-accent-dim) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-accent-dim)" }}
            >
              <Brain size={28} style={{ color: "var(--color-accent)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-xl font-bold"
                  style={{ fontFamily: var(--font-display), color: "var(--color-text)" }}
                >
                  Hermes
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                >
                  by Nous Research
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Autonomous cognitive agent — memory, skills, and cross-platform presence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={refresh}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-muted)",
              }}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <a
              href="https://hermes-agent.nousresearch.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Status */}
      {loading ? (
        <div className="card p-5 animate-pulse" style={{ height: "80px" }} />
      ) : error ? (
        <div
          className="card p-4 flex items-center gap-3"
          style={{ borderColor: "color-mix(in srgb, var(--color-error) 25%, transparent)", background: "color-mix(in srgb, var(--color-error) 5%, transparent)" }}
        >
          <AlertCircle size={16} style={{ color: "var(--color-error)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-error)" }}>
              Service unreachable
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Hermes is not running or still starting up. Check docker compose logs.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Gateway status */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              {isRunning ? (
                <CheckCircle2 size={14} style={{ color: "var(--color-secondary)" }} />
              ) : (
                <AlertCircle size={14} style={{ color: "var(--color-warning)" }} />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Gateway
              </span>
            </div>
            <p
              className="text-lg font-bold"
              style={{
                fontFamily: var(--font-display),
                color: isRunning ? "var(--color-secondary)" : "var(--color-warning)",
              }}
            >
              {isRunning ? "Running" : "Starting"}
            </p>
            {status?.started_at && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
                since {timeAgo(status.started_at)}
              </p>
            )}
          </div>

          {/* Model */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Model
              </span>
            </div>
            <p
              className="text-sm font-bold truncate"
              style={{ fontFamily: var(--font-display), color: "var(--color-text)" }}
            >
              {MODEL_DISPLAY[status?.model ?? ""] ?? status?.model ?? "—"}
            </p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--color-text-subtle)", fontSize: "10px" }}>
              {status?.model}
            </p>
          </div>

          {/* Sessions */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} style={{ color: "var(--color-accent)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Sessions
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: var(--font-display), color: "var(--color-accent)" }}
            >
              {status?.sessions ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
              stored
            </p>
          </div>
        </div>
      )}

      {/* Channels */}
      <div className="card p-5">
        <h3
          className="text-sm font-bold mb-4"
          style={{ fontFamily: var(--font-display) }}
        >
          Active Channels
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
            ))}
          </div>
        ) : !status?.channels?.length ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No channels configured. Add TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, or SLACK_BOT_TOKEN to your .env.
          </p>
        ) : (
          <div className="space-y-2">
            {status.channels.map(ch => {
              const meta = CHANNEL_META[ch] ?? { label: ch, color: "var(--color-primary)" };
              return (
                <div
                  key={ch}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ background: "var(--color-surface-2)" }}
                >
                  <Radio size={14} style={{ color: meta.color }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {meta.label}
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}
                  >
                    Live
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature highlight */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Brain,
            title: "Persistent Memory",
            desc: "Learns from every session. Builds skills automatically.",
            color: "var(--color-accent)",
            bg: "var(--color-accent-dim)",
          },
          {
            icon: Cpu,
            title: "Multi-Provider",
            desc: "Claude, GPT-4, Gemini, OpenRouter — switch any time.",
            color: "var(--color-primary)",
            bg: "var(--color-primary-dim)",
          },
          {
            icon: Clock,
            title: "Cron Automation",
            desc: "Schedule tasks in plain English. Runs unattended.",
            color: "var(--color-secondary)",
            bg: "var(--color-secondary-dim)",
          },
          {
            icon: Radio,
            title: "Cross-Platform",
            desc: "Same agent on Telegram, Discord, Slack, and CLI.",
            color: "var(--color-accent)",
            bg: "var(--color-accent-dim)",
          },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className="card p-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-sm font-semibold" style={{ fontFamily: var(--font-display), color: "var(--color-text)" }}>
              {title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
