"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { ChannelWizard, type ChannelId } from "./wizard";

interface ChannelStatus {
  connected: boolean;
  username?: string;
  guild?: string;
}

interface ChannelsState {
  discord?: ChannelStatus;
  telegram?: ChannelStatus;
  slack?: ChannelStatus;
  whatsapp?: ChannelStatus;
  signal?: ChannelStatus;
}

const CHANNEL_META = [
  {
    id: "discord" as ChannelId,
    name: "Discord",
    icon: "💬",
    color: "#5865F2",
    dim: "rgba(88,101,242,0.12)",
    desc: "Deploy agents as bots in your Discord server. Agents respond in channels, DMs, and threads.",
    wizardAvailable: true,
  },
  {
    id: "telegram" as ChannelId,
    name: "Telegram",
    icon: "✈️",
    color: "#26A5E4",
    dim: "rgba(38,165,228,0.12)",
    desc: "Run agents as Telegram bots. Works in groups and private chats with full markdown support.",
    wizardAvailable: true,
  },
  {
    id: "slack" as ChannelId,
    name: "Slack",
    icon: "🟣",
    color: "#4A154B",
    dim: "rgba(74,21,75,0.18)",
    desc: "Bring agents into your Slack workspace. Mention them in any channel or send DMs.",
    wizardAvailable: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "📱",
    color: "#25D366",
    dim: "rgba(37,211,102,0.12)",
    desc: "Chat with your agents directly on WhatsApp. Business API or Twilio bridge supported.",
    wizardAvailable: false,
    setupHint: "Requires WhatsApp Business API credentials — add in Settings",
  },
  {
    id: "signal",
    name: "Signal",
    icon: "🔒",
    color: "#3A76F0",
    dim: "rgba(58,118,240,0.12)",
    desc: "End-to-end encrypted agent comms via Signal. Maximum privacy for sensitive workflows.",
    wizardAvailable: false,
    setupHint: "Requires Signal CLI setup — see docs",
  },
];

export function ChannelsPanel() {
  const [channels, setChannels] = useState<ChannelsState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardChannel, setWizardChannel] = useState<ChannelId>("discord");

  async function fetchChannels() {
    try {
      const res = await fetch("/api/openclaw/channels/status");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch {
      // OpenClaw not running — show disconnected state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchChannels(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchChannels();
  }

  function openWizard(ch: ChannelId) {
    setWizardChannel(ch);
    setWizardOpen(true);
  }

  const connectedCount = CHANNEL_META.filter(c => channels[c.id as keyof ChannelsState]?.connected).length;

  return (
    <>
      <ChannelWizard
        open={wizardOpen}
        defaultChannel={wizardChannel}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setTimeout(() => {
            setRefreshing(true);
            fetchChannels();
          }, 1500);
        }}
      />

      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}>
              {loading ? "—" : `${connectedCount} of ${CHANNEL_META.length} connected`}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Use the <strong style={{ color: "var(--color-text)" }}>Connect</strong> wizard to set up any channel in under 2 minutes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              disabled={refreshing}
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "var(--color-primary-dim)", border: "1px solid var(--color-primary)", color: "var(--color-primary)" }}
            >
              <Settings size={12} />
              Settings
            </Link>
          </div>
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-1 gap-4">
          {CHANNEL_META.map(ch => {
            const status = channels[ch.id as keyof ChannelsState];
            const connected = status?.connected ?? false;

            return (
              <div
                key={ch.id}
                className="card p-5"
                style={{
                  background: connected ? `linear-gradient(135deg, ${ch.dim} 0%, var(--color-surface) 60%)` : "var(--color-surface)",
                  borderColor: connected ? `${ch.color}33` : "var(--color-border)",
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: ch.dim }}
                  >
                    {ch.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="font-bold text-base"
                        style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                      >
                        {ch.name}
                      </h3>
                      {loading ? (
                        <span className="h-5 w-20 rounded-full animate-pulse inline-block" style={{ background: "var(--color-surface-2)" }} />
                      ) : connected ? (
                        <span
                          className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ background: "color-mix(in srgb, var(--color-secondary) 15%, transparent)", color: "var(--color-secondary)" }}
                        >
                          <span className="status-dot active" style={{ width: "6px", height: "6px" }} />
                          Connected
                          {status?.username && ` · @${status.username}`}
                          {status?.guild && ` · ${status.guild}`}
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: "var(--color-surface-2)", color: "var(--color-text-subtle)", border: "1px solid var(--color-border)" }}
                        >
                          Not connected
                        </span>
                      )}
                    </div>

                    <p className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
                      {ch.desc}
                    </p>

                    {!connected && "setupHint" in ch && ch.setupHint && (
                      <p className="text-xs" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}>
                        {ch.setupHint}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {connected ? (
                      <Link
                        href="/settings"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                      >
                        <Settings size={12} />
                        Manage
                      </Link>
                    ) : ch.wizardAvailable ? (
                      <button
                        onClick={() => openWizard(ch.id as ChannelId)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: ch.dim,
                          border: `1px solid ${ch.color}44`,
                          color: ch.color,
                        }}
                      >
                        <Plus size={12} />
                        Connect
                      </button>
                    ) : (
                      <Link
                        href="/settings#channels"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: ch.dim,
                          border: `1px solid ${ch.color}44`,
                          color: ch.color,
                        }}
                      >
                        <ExternalLink size={12} />
                        Setup
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info footer */}
        <div
          className="p-4 rounded-xl text-xs"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-subtle)", fontFamily: "var(--font-mono)" }}
        >
          Channel status is fetched from OpenClaw. If channels show "Not connected" after saving a token, make sure OpenClaw is running.
        </div>
      </div>
    </>
  );
}
