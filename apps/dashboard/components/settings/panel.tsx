"use client";

import { useEffect, useState, useRef } from "react";
import { Check, RefreshCw, Eye, EyeOff, Zap } from "lucide-react";
import { ChannelWizard, type ChannelId } from "@/components/channels/wizard";

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  name: string;
  ok: boolean;
  status: string;
}

interface HealthResponse {
  services: ServiceStatus[];
  allHealthy: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flash() {
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 2000);
  }
  return [saved, flash];
}

// ── Key row ──────────────────────────────────────────────────────────────────

function KeyRow({
  emoji,
  label,
  placeholder,
  defaultValue,
  onSave,
  wizardChannel,
  onOpenWizard,
}: {
  emoji: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  onSave: (value: string) => Promise<void>;
  wizardChannel?: ChannelId;
  onOpenWizard?: (ch: ChannelId) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSaved();

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
    flashSaved();
  }

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <span className="text-xl w-8 text-center flex-shrink-0">{emoji}</span>
      <span className="text-sm font-medium w-28 flex-shrink-0" style={{ color: "var(--color-text)" }}>
        {label}
      </span>
      <div
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--color-text)" }}
        />
        <button onClick={() => setShow(v => !v)} style={{ color: "var(--color-text-muted)" }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {/* Setup wizard button for supported channels */}
      {wizardChannel && onOpenWizard && (
        <button
          onClick={() => onOpenWizard(wizardChannel)}
          title="Open setup wizard"
          className="px-2.5 py-2 rounded-lg text-xs flex items-center gap-1 flex-shrink-0 transition-all"
          style={{
            background: "var(--color-primary-dim)",
            border: "1px solid rgba(105,218,255,0.25)",
            color: "var(--color-primary)",
          }}
        >
          <Zap size={12} />
          <span className="hidden sm:inline">Guide</span>
        </button>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !value.trim()}
        className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all disabled:opacity-40"
        style={{
          background: saved ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
          color: saved ? "var(--color-secondary)" : "var(--color-text-muted)",
          border: `1px solid ${saved ? "var(--color-secondary)" : "var(--color-border)"}`,
        }}
      >
        {saved ? <Check size={13} /> : saving ? "Saving…" : "Save"}
        {saved && <span>Saved</span>}
      </button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardChannel, setWizardChannel] = useState<ChannelId>("discord");

  const anthropicDefault =
    typeof window !== "undefined" ? localStorage.getItem("clawhq_anthropic_key") ?? "" : "";

  async function fetchHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => { fetchHealth(); }, []);

  async function saveLlmKey(provider: string, key: string) {
    try {
      await fetch("/api/openfang/api/config/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
    } catch { /* graceful — endpoint may not exist yet */ }
  }

  async function saveChannelToken(channel: string, token: string) {
    try {
      await fetch("/api/openclaw/config/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, token }),
      });
    } catch { /* graceful */ }
  }

  function openWizard(ch: ChannelId) {
    setWizardChannel(ch);
    setWizardOpen(true);
  }

  return (
    <>
      <ChannelWizard
        open={wizardOpen}
        defaultChannel={wizardChannel}
        onClose={() => setWizardOpen(false)}
      />

      <div className="space-y-8 max-w-3xl animate-fade-in">

        {/* ── A. LLM API Keys ── */}
        <section>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
              LLM API Keys
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Provide your own API keys. Stored locally and pushed to your OpenFang instance.
            </p>
            <KeyRow
              emoji="🤖"
              label="Anthropic"
              placeholder="sk-ant-..."
              defaultValue={anthropicDefault}
              onSave={key => {
                localStorage.setItem("clawhq_anthropic_key", key);
                return saveLlmKey("anthropic", key);
              }}
            />
            <KeyRow
              emoji="🟢"
              label="OpenAI"
              placeholder="sk-..."
              onSave={key => saveLlmKey("openai", key)}
            />
            <KeyRow
              emoji="⚡"
              label="Groq"
              placeholder="gsk_..."
              onSave={key => saveLlmKey("groq", key)}
            />
            <KeyRow
              emoji="🔀"
              label="OpenRouter"
              placeholder="sk-or-..."
              onSave={key => saveLlmKey("openrouter", key)}
            />
          </div>
        </section>

        {/* ── B. Channel Tokens ── */}
        <section id="channels">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
              Channel Tokens
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Connect external channels so your agents can receive and send messages.
              Hit <span className="text-primary font-medium">Guide</span> for step-by-step setup.
            </p>
            <KeyRow
              emoji="💬"
              label="Discord"
              placeholder="Bot token..."
              wizardChannel="discord"
              onOpenWizard={openWizard}
              onSave={token => saveChannelToken("discord", token)}
            />
            <KeyRow
              emoji="✈️"
              label="Telegram"
              placeholder="Bot token..."
              wizardChannel="telegram"
              onOpenWizard={openWizard}
              onSave={token => saveChannelToken("telegram", token)}
            />
            <KeyRow
              emoji="🟣"
              label="Slack"
              placeholder="xoxb-..."
              wizardChannel="slack"
              onOpenWizard={openWizard}
              onSave={token => saveChannelToken("slack", token)}
            />
            <KeyRow
              emoji="📱"
              label="WhatsApp"
              placeholder="Token..."
              onSave={token => saveChannelToken("whatsapp", token)}
            />
          </div>
        </section>

        {/* ── C. Service Status ── */}
        <section id="service-status">
          <div className="card" style={{ padding: "1.5rem" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
                  Service Status
                </h2>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Live health of connected services.
                </p>
              </div>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
              >
                <RefreshCw size={13} className={healthLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            {health ? (
              <div className="space-y-2">
                {health.services.map(svc => (
                  <div
                    key={svc.name}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                    style={{ background: "var(--color-surface-2)" }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: svc.ok ? "var(--color-secondary)" : "var(--color-warning)" }}
                    />
                    <span className="text-sm font-medium flex-1" style={{ color: "var(--color-text)" }}>
                      {svc.name}
                    </span>
                    <span
                      className="text-xs capitalize"
                      style={{ color: svc.ok ? "var(--color-secondary)" : "var(--color-warning)" }}
                    >
                      {svc.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── D. Danger Zone ── */}
        <section>
          <div
            className="card"
            style={{ padding: "1.5rem", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "#ef4444", fontFamily: "var(--font-display)" }}>
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
              <button
                onClick={() => {
                  document.cookie = "clawhq_setup=; path=/; max-age=0";
                  localStorage.removeItem("clawhq_anthropic_key");
                  window.location.href = "/onboarding";
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0 ml-4 transition-all"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.35)",
                }}
              >
                Reset onboarding
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
