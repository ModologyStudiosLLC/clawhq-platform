"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowRight, Check, Copy, Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChannelId =
  | "discord" | "telegram" | "slack" | "whatsapp" | "signal"
  | "imessage" | "msteams" | "googlechat" | "matrix" | "mattermost"
  | "line" | "irc" | "twitch" | "nostr" | "feishu" | "zalo";

interface ChannelWizardProps {
  open: boolean;
  defaultChannel?: ChannelId;
  onClose: () => void;
  onSaved?: (channel: ChannelId) => void;
}

interface Step { title: string; body: React.ReactNode; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-xs transition-all"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: copied ? "var(--color-secondary)" : "var(--color-text-muted)" }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{text}</span>
    </button>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
      style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
      {n}
    </span>
  );
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
      <StepNum n={n} />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function ExternalBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{ background: "var(--color-primary-dim)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)", color: "var(--color-primary)" }}>
      {label} <ExternalLink size={11} />
    </a>
  );
}

// ── Channel definitions ───────────────────────────────────────────────────────

const CHANNELS: Record<ChannelId, {
  label: string; icon: string; color: string; dim: string;
  tokenLabel: string; tokenPlaceholder: string; group: string; steps: Step[];
}> = {
  discord: {
    label: "Discord", icon: "💬", color: "#5865F2", dim: "rgba(88,101,242,0.12)",
    tokenLabel: "Bot Token", tokenPlaceholder: "MTxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxx", group: "Popular",
    steps: [
      { title: "Create a Discord Application", body: <StepRow n={1}>Go to the Discord Developer Portal and create a new application.<div className="mt-2"><ExternalBtn href="https://discord.com/developers/applications" label="Open Developer Portal" /></div></StepRow> },
      { title: "Add a Bot", body: <div className="space-y-0.5"><StepRow n={2}>In your application, click <strong className="text-white">Bot</strong> in the sidebar, then <strong className="text-white">Add Bot</strong>.</StepRow><StepRow n={3}>Enable <strong className="text-white">Message Content Intent</strong> and <strong className="text-white">Server Members Intent</strong>.</StepRow><StepRow n={4}>Click <strong className="text-white">Reset Token</strong> → confirm → copy the token.</StepRow></div> },
      { title: "Invite bot to your server", body: <div className="space-y-0.5"><StepRow n={5}>Go to <strong className="text-white">OAuth2 → URL Generator</strong>. Select scopes: <CopySnippet text="bot" /> <CopySnippet text="applications.commands" /></StepRow><StepRow n={6}>Bot permissions: <em>Send Messages, Read Message History, View Channels, Use Slash Commands</em>. Copy the URL and add the bot to your server.</StepRow></div> },
    ],
  },

  telegram: {
    label: "Telegram", icon: "✈️", color: "#26A5E4", dim: "rgba(38,165,228,0.12)",
    tokenLabel: "Bot Token", tokenPlaceholder: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz", group: "Popular",
    steps: [
      { title: "Talk to @BotFather", body: <StepRow n={1}>Open Telegram and message <CopySnippet text="@BotFather" />. Send <CopySnippet text="/newbot" /> and follow the prompts to create your bot.<div className="mt-2"><ExternalBtn href="https://t.me/BotFather" label="Open BotFather" /></div></StepRow> },
      { title: "Copy your token", body: <div className="space-y-0.5"><StepRow n={2}>BotFather will reply with a token like <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>1234567890:ABC...</code> — copy it.</StepRow><StepRow n={3}>Optional: Send <CopySnippet text="/setjoingroups" /> to allow the bot in group chats.</StepRow></div> },
    ],
  },

  slack: {
    label: "Slack", icon: "🟣", color: "#4A154B", dim: "rgba(74,21,75,0.18)",
    tokenLabel: "Bot OAuth Token", tokenPlaceholder: "xoxb-0000000000000-0000000000000-xxxxxxxxxxxxxxxxxxxxxxxx", group: "Popular",
    steps: [
      { title: "Create a Slack App", body: <StepRow n={1}>Go to the Slack API portal and create a new app <strong className="text-white">From scratch</strong>.<div className="mt-2"><ExternalBtn href="https://api.slack.com/apps?new_app=1" label="Create Slack App" /></div></StepRow> },
      { title: "Add OAuth scopes", body: <div><StepRow n={2}>Under <strong className="text-white">OAuth &amp; Permissions → Bot Token Scopes</strong>, add:</StepRow><div className="flex flex-wrap gap-1.5 ml-8 mt-1">{["chat:write","channels:history","app_mentions:read","channels:read","im:history","im:read","im:write"].map(s => <CopySnippet key={s} text={s} />)}</div></div> },
      { title: "Enable Socket Mode", body: <div className="space-y-0.5"><StepRow n={3}>Under <strong className="text-white">Socket Mode</strong>, toggle on and create an App-Level Token with <CopySnippet text="connections:write" /> scope.</StepRow><StepRow n={4}>Install to workspace, then copy the <strong className="text-white">Bot User OAuth Token</strong> (starts with <CopySnippet text="xoxb-" />).</StepRow></div> },
    ],
  },

  whatsapp: {
    label: "WhatsApp", icon: "📱", color: "#25D366", dim: "rgba(37,211,102,0.12)",
    tokenLabel: "Phone Number ID + Token", tokenPlaceholder: "PHONE_ID|ACCESS_TOKEN", group: "Popular",
    steps: [
      { title: "Create a Meta App", body: <StepRow n={1}>Go to Meta for Developers and create a new Business app with WhatsApp enabled.<div className="mt-2"><ExternalBtn href="https://developers.facebook.com/apps/creation/" label="Create Meta App" /></div></StepRow> },
      { title: "Get your credentials", body: <div className="space-y-0.5"><StepRow n={2}>In your app, go to <strong className="text-white">WhatsApp → API Setup</strong>.</StepRow><StepRow n={3}>Copy your <strong className="text-white">Phone number ID</strong> and generate a <strong className="text-white">Temporary access token</strong> (or a permanent System User token for production).</StepRow></div> },
      { title: "Configure webhook", body: <StepRow n={4}>Under <strong className="text-white">Webhooks</strong>, set your verify token and subscribe to <CopySnippet text="messages" /> events. Your OpenClaw webhook URL will be shown after saving.</StepRow> },
    ],
  },

  signal: {
    label: "Signal", icon: "🔒", color: "#3A76F0", dim: "rgba(58,118,240,0.12)",
    tokenLabel: "Phone Number", tokenPlaceholder: "+15551234567", group: "Privacy",
    steps: [
      { title: "Install signal-cli", body: <StepRow n={1}>Install signal-cli on the machine running OpenClaw. <div className="mt-2"><ExternalBtn href="https://github.com/AsamK/signal-cli/releases" label="signal-cli releases" /></div></StepRow> },
      { title: "Register a number", body: <div className="space-y-0.5"><StepRow n={2}>Use a dedicated phone number (SIM or VoIP). Register with: <CopySnippet text="signal-cli -a +1XXXXXXXXXX register" /></StepRow><StepRow n={3}>Verify the SMS code: <CopySnippet text="signal-cli -a +1XXXXXXXXXX verify CODE" /></StepRow></div> },
      { title: "Link to OpenClaw", body: <StepRow n={4}>Enter your registered phone number below. OpenClaw will connect to the local signal-cli daemon automatically.</StepRow> },
    ],
  },

  imessage: {
    label: "iMessage", icon: "🍎", color: "#30D158", dim: "rgba(48,209,88,0.12)",
    tokenLabel: "BlueBubbles Server URL", tokenPlaceholder: "http://your-mac-ip:1234", group: "Privacy",
    steps: [
      { title: "Install BlueBubbles", body: <StepRow n={1}>BlueBubbles runs on a Mac and bridges iMessage to an API. Download and install the server app.<div className="mt-2"><ExternalBtn href="https://bluebubbles.app/downloads/" label="Download BlueBubbles" /></div></StepRow> },
      { title: "Configure BlueBubbles", body: <div className="space-y-0.5"><StepRow n={2}>Open BlueBubbles → <strong className="text-white">Settings</strong>. Set a <strong className="text-white">Server Password</strong> and note your local IP address.</StepRow><StepRow n={3}>Enable <strong className="text-white">Private API</strong> for full send/receive support (requires SIP disabled or macOS virtualisation).</StepRow></div> },
      { title: "Enter your server URL", body: <StepRow n={4}>Enter your BlueBubbles server URL below, including the port. Format: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>http://IP:PORT|PASSWORD</code></StepRow> },
    ],
  },

  msteams: {
    label: "Teams", icon: "🔷", color: "#4B53BC", dim: "rgba(75,83,188,0.12)",
    tokenLabel: "Bot Framework Token", tokenPlaceholder: "Paste token from Azure Bot Service", group: "Enterprise",
    steps: [
      { title: "Register an Azure Bot", body: <StepRow n={1}>In the Azure Portal, create an <strong className="text-white">Azure Bot</strong> resource. Select <strong className="text-white">Multi-Tenant</strong> for the app type.<div className="mt-2"><ExternalBtn href="https://portal.azure.com/#create/Microsoft.AzureBot" label="Create Azure Bot" /></div></StepRow> },
      { title: "Add the Teams channel", body: <div className="space-y-0.5"><StepRow n={2}>In your Bot resource, go to <strong className="text-white">Channels → Microsoft Teams</strong> and enable it.</StepRow><StepRow n={3}>Under <strong className="text-white">Configuration</strong>, copy your <strong className="text-white">Microsoft App ID</strong> and generate a <strong className="text-white">Client Secret</strong>.</StepRow></div> },
      { title: "Enter credentials", body: <StepRow n={4}>Paste your App ID and Client Secret separated by a pipe: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>APP_ID|CLIENT_SECRET</code></StepRow> },
    ],
  },

  googlechat: {
    label: "Google Chat", icon: "💭", color: "#1A73E8", dim: "rgba(26,115,232,0.12)",
    tokenLabel: "Service Account JSON (base64)", tokenPlaceholder: "eyJ0eXBlIjoic2Vydm...", group: "Enterprise",
    steps: [
      { title: "Create a Google Cloud Project", body: <StepRow n={1}>Go to Google Cloud Console and create a new project (or use an existing one).<div className="mt-2"><ExternalBtn href="https://console.cloud.google.com/projectcreate" label="Create Project" /></div></StepRow> },
      { title: "Enable the Chat API", body: <div className="space-y-0.5"><StepRow n={2}>Enable the <strong className="text-white">Google Chat API</strong> in your project. Under <strong className="text-white">Configuration</strong>, set the app name and publish it.</StepRow><StepRow n={3}>Create a <strong className="text-white">Service Account</strong>, download the JSON key, and base64-encode it: <CopySnippet text="base64 -i key.json | tr -d '\n'" /></StepRow></div> },
    ],
  },

  matrix: {
    label: "Matrix", icon: "🔢", color: "#0DBD8B", dim: "rgba(13,189,139,0.12)",
    tokenLabel: "Access Token", tokenPlaceholder: "syt_xxxx_xxxxxxxxxxxx_xxxxxxxx", group: "Open Source",
    steps: [
      { title: "Create a Matrix account", body: <StepRow n={1}>Register a dedicated account on any Matrix homeserver (e.g. matrix.org). This account will be your bot.<div className="mt-2"><ExternalBtn href="https://app.element.io/#/register" label="Register on Element" /></div></StepRow> },
      { title: "Get an access token", body: <div className="space-y-0.5"><StepRow n={2}>Log into Element Web → <strong className="text-white">Settings → Help &amp; About → Advanced</strong>.</StepRow><StepRow n={3}>Copy the <strong className="text-white">Access Token</strong>. Also note your full Matrix user ID (e.g. <code className="text-xs">@bot:matrix.org</code>) and homeserver URL.</StepRow></div> },
      { title: "Enter credentials", body: <StepRow n={4}>Paste as: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>ACCESS_TOKEN|@user:homeserver.org|https://homeserver.org</code></StepRow> },
    ],
  },

  mattermost: {
    label: "Mattermost", icon: "⚡", color: "#0058CC", dim: "rgba(0,88,204,0.12)",
    tokenLabel: "Bot Access Token", tokenPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxx", group: "Open Source",
    steps: [
      { title: "Create a Bot Account", body: <StepRow n={1}>In Mattermost, go to <strong className="text-white">System Console → Integrations → Bot Accounts</strong> and create a new bot.</StepRow> },
      { title: "Get your token", body: <div className="space-y-0.5"><StepRow n={2}>Copy the <strong className="text-white">Access Token</strong> shown after bot creation (you can also generate one via <strong className="text-white">Account Settings → Security → Personal Access Tokens</strong>).</StepRow><StepRow n={3}>Note your Mattermost server URL (e.g. <code className="text-xs">https://mattermost.yourcompany.com</code>).</StepRow></div> },
      { title: "Enter credentials", body: <StepRow n={4}>Paste as: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>TOKEN|https://your-mattermost-url.com</code></StepRow> },
    ],
  },

  line: {
    label: "LINE", icon: "🟩", color: "#06C755", dim: "rgba(6,199,85,0.12)",
    tokenLabel: "Channel Access Token", tokenPlaceholder: "LONG_TOKEN_HERE", group: "Asia",
    steps: [
      { title: "Create a Messaging API channel", body: <StepRow n={1}>Go to LINE Developers Console and create a new <strong className="text-white">Messaging API</strong> channel.<div className="mt-2"><ExternalBtn href="https://developers.line.biz/console/" label="LINE Developers Console" /></div></StepRow> },
      { title: "Get your token", body: <div className="space-y-0.5"><StepRow n={2}>Under <strong className="text-white">Messaging API → Channel access token</strong>, click <strong className="text-white">Issue</strong> to generate a long-lived token.</StepRow><StepRow n={3}>Set the webhook URL to your OpenClaw endpoint and enable <strong className="text-white">Use webhook</strong>.</StepRow></div> },
    ],
  },

  irc: {
    label: "IRC", icon: "📡", color: "#9B59B6", dim: "rgba(155,89,182,0.12)",
    tokenLabel: "Server connection string", tokenPlaceholder: "irc://nick:pass@irc.libera.chat:6697/#channel", group: "Classic",
    steps: [
      { title: "Choose a network", body: <StepRow n={1}>Pick an IRC network (e.g. Libera.Chat, OFTC, Rizon). Register a nick with NickServ if required.</StepRow> },
      { title: "Format your connection string", body: <div className="space-y-0.5"><StepRow n={2}>Format: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>irc://NICK:PASSWORD@HOST:PORT/#CHANNEL</code></StepRow><StepRow n={3}>Use port 6697 for TLS (recommended). Omit the password if no NickServ registration.</StepRow></div> },
    ],
  },

  twitch: {
    label: "Twitch", icon: "🎮", color: "#9146FF", dim: "rgba(145,70,255,0.12)",
    tokenLabel: "OAuth Token", tokenPlaceholder: "oauth:xxxxxxxxxxxxxxxxxxxxxx", group: "Streaming",
    steps: [
      { title: "Register a Twitch App", body: <StepRow n={1}>Go to the Twitch Developer Console and register a new application.<div className="mt-2"><ExternalBtn href="https://dev.twitch.tv/console/apps/create" label="Twitch Developer Console" /></div></StepRow> },
      { title: "Get a chat OAuth token", body: <div className="space-y-0.5"><StepRow n={2}>Use the Twitch Chat OAuth generator to get a token for the bot account.<div className="mt-2"><ExternalBtn href="https://twitchapps.com/tmi/" label="Generate OAuth Token" /></div></StepRow><StepRow n={3}>Note the channel name(s) you want the bot to join.</StepRow></div> },
      { title: "Enter credentials", body: <StepRow n={4}>Format: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>oauth:TOKEN|#channel1,#channel2</code></StepRow> },
    ],
  },

  nostr: {
    label: "Nostr", icon: "🌐", color: "#FF7B00", dim: "rgba(255,123,0,0.12)",
    tokenLabel: "Private Key (nsec or hex)", tokenPlaceholder: "nsec1xxxxxxxxxxxxxxxxxxxx", group: "Decentralised",
    steps: [
      { title: "Create a Nostr keypair", body: <StepRow n={1}>Generate a new keypair using any Nostr client (Damus, Snort, Amethyst) or via the CLI: <CopySnippet text="openssl rand -hex 32" /></StepRow> },
      { title: "Enter your private key", body: <div className="space-y-0.5"><StepRow n={2}>Paste your <strong className="text-white">nsec</strong> (Bech32) or raw hex private key. OpenClaw will derive the public key automatically.</StepRow><StepRow n={3}>Optionally append relay URLs separated by commas: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>nsec1...|wss://relay.damus.io,wss://nos.lol</code></StepRow></div> },
    ],
  },

  feishu: {
    label: "Feishu / Lark", icon: "🪶", color: "#00B0F0", dim: "rgba(0,176,240,0.12)",
    tokenLabel: "App ID + App Secret", tokenPlaceholder: "cli_xxxx|SECRET", group: "Asia",
    steps: [
      { title: "Create a Feishu App", body: <StepRow n={1}>Go to the Feishu Open Platform and create a new custom app.<div className="mt-2"><ExternalBtn href="https://open.feishu.cn/app" label="Feishu Open Platform" /></div></StepRow> },
      { title: "Get credentials", body: <div className="space-y-0.5"><StepRow n={2}>Under <strong className="text-white">Credentials &amp; Basic Info</strong>, copy the <strong className="text-white">App ID</strong> and <strong className="text-white">App Secret</strong>.</StepRow><StepRow n={3}>Under <strong className="text-white">Event Subscriptions</strong>, add your OpenClaw webhook URL and subscribe to <strong className="text-white">im.message.receive_v1</strong>.</StepRow></div> },
      { title: "Enter credentials", body: <StepRow n={4}>Format: <code className="text-xs px-1 rounded" style={{ background: "var(--color-border)" }}>APP_ID|APP_SECRET</code></StepRow> },
    ],
  },

  zalo: {
    label: "Zalo", icon: "🇻🇳", color: "#0068FF", dim: "rgba(0,104,255,0.12)",
    tokenLabel: "OA Access Token", tokenPlaceholder: "ACCESS_TOKEN_HERE", group: "Asia",
    steps: [
      { title: "Create a Zalo Official Account", body: <StepRow n={1}>Register a Zalo Official Account and create an app in the Zalo Developer Portal.<div className="mt-2"><ExternalBtn href="https://developers.zalo.me/app" label="Zalo Developer Portal" /></div></StepRow> },
      { title: "Get OA Access Token", body: <div className="space-y-0.5"><StepRow n={2}>In your app, go to <strong className="text-white">Official Account → OA API</strong>.</StepRow><StepRow n={3}>Generate an <strong className="text-white">OA Access Token</strong> and register your webhook URL.</StepRow></div> },
    ],
  },
};

// Group ordering
const CHANNEL_GROUPS: { label: string; ids: ChannelId[] }[] = [
  { label: "Popular", ids: ["discord", "telegram", "slack", "whatsapp"] },
  { label: "Privacy", ids: ["signal", "imessage"] },
  { label: "Enterprise", ids: ["msteams", "googlechat"] },
  { label: "Open Source", ids: ["matrix", "mattermost"] },
  { label: "Streaming", ids: ["twitch"] },
  { label: "Classic", ids: ["irc"] },
  { label: "Decentralised", ids: ["nostr"] },
  { label: "Asia", ids: ["line", "feishu", "zalo"] },
];

// ── Token input step ──────────────────────────────────────────────────────────

function TokenInput({ channel, onSaved }: { channel: ChannelId; onSaved: () => void }) {
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
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "var(--color-surface-2)", border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}` }}>
          <input type={show ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)}
            placeholder={cfg.tokenPlaceholder} className="flex-1 bg-transparent text-sm font-mono outline-none"
            style={{ color: "var(--color-text)" }} onKeyDown={e => { if (e.key === "Enter") handleSave(); }} />
          <button onClick={() => setShow(v => !v)} style={{ color: "var(--color-text-muted)" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{error}</p>}
      </div>
      <button onClick={handleSave} disabled={saving || !token.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${CHANNELS[channel].color}cc, ${CHANNELS[channel].color})`, color: "#fff" }}>
        {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Check size={14} />Save &amp; Connect</>}
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

  useEffect(() => {
    if (open) { setActiveChannel(defaultChannel); setStepIdx(0); setDone(false); }
  }, [open, defaultChannel]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cfg = CHANNELS[activeChannel];
  const steps = cfg.steps;
  const isLast = stepIdx === steps.length - 1;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>
                Connect {cfg.label}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                {done ? "All done!" : `Step ${stepIdx + 1} of ${steps.length + 1}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Channel grid */}
        <div className="px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "var(--color-border)" }}>
          <div className="space-y-2 min-w-max">
            {CHANNEL_GROUPS.map(group => (
              <div key={group.label} className="flex items-center gap-1">
                <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>{group.label}</span>
                <div className="flex gap-1 flex-wrap">
                  {group.ids.map(ch => {
                    const c = CHANNELS[ch];
                    const active = ch === activeChannel;
                    return (
                      <button key={ch} onClick={() => { setActiveChannel(ch); setStepIdx(0); setDone(false); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: active ? c.dim : "var(--color-surface-2)",
                          border: `1px solid ${active ? `${c.color}66` : "var(--color-border)"}`,
                          color: active ? c.color : "var(--color-text-muted)",
                        }}>
                        <span>{c.icon}</span>{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-3">
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: done ? "100%" : `${((stepIdx + 1) / (steps.length + 1)) * 100}%`, background: `linear-gradient(90deg, ${cfg.color}, var(--color-secondary))` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-secondary-dim)" }}>
                <Check size={24} style={{ color: "var(--color-secondary)" }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: var(--font-display), color: "var(--color-text)" }}>{cfg.label} connected!</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Your agents will now respond in {cfg.label}. It may take a moment to go live.</p>
            </div>
          ) : stepIdx < steps.length ? (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>{steps[stepIdx].title}</h3>
              <div className="rounded-xl p-4" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                {steps[stepIdx].body}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)", fontFamily: var(--font-display) }}>Paste your token</h3>
              <div className="rounded-xl p-4" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                <TokenInput channel={activeChannel} onSaved={() => { setDone(true); onSaved?.(activeChannel); }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={() => setStepIdx(v => Math.max(0, v - 1))} disabled={stepIdx === 0}
              className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30" style={{ color: "var(--color-text-muted)" }}>
              Back
            </button>
            {stepIdx < steps.length && (
              <button onClick={() => setStepIdx(v => v + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "var(--color-primary-dim)", border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)", color: "var(--color-primary)" }}>
                {isLast ? "Add token" : "Next"} <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
        {done && (
          <div className="flex justify-center px-6 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: `linear-gradient(135deg, ${cfg.color}, var(--color-secondary))`, color: "#fff" }}>
              Back to Channels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
