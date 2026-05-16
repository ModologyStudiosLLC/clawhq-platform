"use client";

import { useState } from "react";
import {
  Activity, AlertCircle, ArrowRight, Bot, Brain,
  Calendar, CheckCircle2, ChevronRight, Cpu, DollarSign,
  ExternalLink, Globe, Layers, Shield, Sparkles, Terminal,
  TrendingDown, Zap, X
} from "lucide-react";
import Link from "next/link";

// ── Demo data — pre-seeded MSP scenario ───────────────────────────────────────
const DEMO_AGENTS = [
  { id: "1", name: "Felix",        role: "Sales & Comms",   state: "running", provider: "Anthropic", tasks: 14, lastActive: "2m ago",  color: "var(--color-primary)" },
  { id: "2", name: "Researcher",   role: "Intel & Analysis", state: "running", provider: "Groq",      tasks: 31, lastActive: "just now", color: "var(--color-secondary)" },
  { id: "3", name: "ContentBot",   role: "Content Pipeline", state: "running", provider: "DeepSeek",  tasks: 8,  lastActive: "11m ago", color: "var(--color-accent)" },
  { id: "4", name: "CostOptimizer",role: "LLM Cost Control", state: "running", provider: "Anthropic", tasks: 203,lastActive: "1m ago",  color: "var(--color-error)" },
  { id: "5", name: "JobFinder",    role: "Recruitment Intel",state: "idle",    provider: "Groq",      tasks: 3,  lastActive: "1h ago",  color: "var(--color-text-muted)" },
];

const DEMO_SKILLS = [
  { name: "crm-automation",        category: "Sales",       status: "active",  calls: 847  },
  { name: "code-review-5pass",     category: "Engineering", status: "active",  calls: 23   },
  { name: "client-health-monitor", category: "Operations",  status: "active",  calls: 214  },
  { name: "msp-security-sweep",    category: "Security",    status: "active",  calls: 91   },
  { name: "video-lens",            category: "Content",     status: "active",  calls: 156  },
  { name: "enrich-lead",           category: "Sales",       status: "idle",    calls: 412  },
];

const DEMO_COST_DATA = {
  thisMonth:   847,
  lastMonth:  1923,
  saved:      1076,
  savedPct:    56,
  topModel:   "claude-sonnet-4-6",
  topCost:     312,
  cacheHitPct: 68,
  tokens:      "4.2M",
};

const DEMO_ACTIVITY = [
  { time: "2m ago",  agent: "Felix",         event: "Sent Day-3 drip email to evan@kestrel.ai",         status: "success" },
  { time: "4m ago",  agent: "CostOptimizer", event: "Routed 3 requests to DeepSeek → saved $0.14",      status: "success" },
  { time: "11m ago", agent: "ContentBot",    event: "Published daily AI + hardware newsletter draft",     status: "success" },
  { time: "18m ago", agent: "Researcher",    event: "Scraped 12 new competitor pricing signals",          status: "success" },
  { time: "1h ago",  agent: "Felix",         event: "Reply from drip prospect — CRM opportunity created", status: "hot"     },
  { time: "2h ago",  agent: "CostOptimizer", event: "Weekly savings report generated — $1,076 saved MTD",status: "success" },
  { time: "3h ago",  agent: "ContentBot",    event: "3 short-form posts drafted for Twitter/X",           status: "success" },
  { time: "5h ago",  agent: "Researcher",    event: "Channel intel DB updated — 214 new entries",        status: "success" },
];

const DEMO_HEALTH = [
  { name: "OpenClaw Gateway",   status: "healthy",  latency: "12ms"  },
  { name: "Hermes Orchestrator",status: "healthy",  latency: "8ms"   },
  { name: "AgentMail",          status: "healthy",  latency: "143ms" },
  { name: "Twenty CRM",         status: "healthy",  latency: "34ms"  },
  { name: "Cloudflare Workers", status: "healthy",  latency: "6ms"   },
  { name: "Skills Registry",    status: "healthy",  latency: "22ms"  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "var(--color-secondary)",
    healthy: "var(--color-secondary)",
    active:  "var(--color-secondary)",
    idle:    "var(--color-text-muted)",
    hot:     "var(--color-error)",
    success: "var(--color-secondary)",
  };
  const isRunning = status === "running" || status === "healthy";
  return (
    <span className="relative flex h-2 w-2">
      {isRunning && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ background: colors[status] ?? "var(--color-secondary)" }} />
      )}
      <span className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: colors[status] ?? "var(--color-text-muted)" }} />
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-text-subtle)" }}>
      {children}
    </h2>
  );
}

// ── Nav tabs ──────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Agents", "Skills", "Cost", "Health"] as const;
type Tab = typeof TABS[number];

// ── Demo banner ───────────────────────────────────────────────────────────────
function DemoBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-2.5 text-sm font-medium"
      style={{ background: "var(--color-primary)", color: "#fff" }}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>You're viewing a live demo of ClawHQ — pre-seeded with a sample AI operations environment.</span>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <a href="https://cal.com/mike-flanigan/clawhq-demo"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
          Book a 15-min call <ArrowRight className="w-3.5 h-3.5" />
        </a>
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Bot,         label: "Active Agents",  value: "4 / 5",    sub: "1 idle",          color: "var(--color-primary)"   },
          { icon: Zap,         label: "Tasks Today",    value: "259",       sub: "+18% vs yesterday",color: "var(--color-secondary)" },
          { icon: TrendingDown,label: "LLM Saved MTD",  value: "$1,076",    sub: "56% reduction",    color: "var(--color-accent)"    },
          { icon: Layers,      label: "Skills Active",  value: "6",         sub: "2 idle",           color: "var(--color-error)"     },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: "var(--color-text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{sub}</p>
          </Card>
        ))}
      </div>

      {/* Agents quick view + Activity feed */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <SectionTitle>Agents</SectionTitle>
          <div className="space-y-2">
            {DEMO_AGENTS.map(a => (
              <Card key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `color-mix(in srgb, ${a.color} 15%, transparent)`, color: a.color }}>
                  {a.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{a.name}</span>
                    <StatusDot status={a.state} />
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{a.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{a.tasks} tasks</p>
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{a.lastActive}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Recent Activity</SectionTitle>
          <div className="space-y-2">
            {DEMO_ACTIVITY.slice(0, 5).map((ev, i) => (
              <Card key={i} className="flex items-start gap-3">
                <StatusDot status={ev.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: "var(--color-text)" }}>{ev.event}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
                    {ev.agent} · {ev.time}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Agents ───────────────────────────────────────────────────────────────
function AgentsTab() {
  return (
    <div className="space-y-3">
      <SectionTitle>Deployed Agents</SectionTitle>
      {DEMO_AGENTS.map(a => (
        <Card key={a.id} className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `color-mix(in srgb, ${a.color} 18%, transparent)`, color: a.color }}>
            {a.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{a.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: a.state === "running" ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
                  color: a.state === "running" ? "var(--color-secondary)" : "var(--color-text-muted)",
                }}>
                {a.state}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{a.role} · {a.provider}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{a.tasks}</p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>tasks · {a.lastActive}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Tab: Skills ───────────────────────────────────────────────────────────────
function SkillsTab() {
  return (
    <div className="space-y-3">
      <SectionTitle>Installed Skills — 6 active</SectionTitle>
      <div className="grid md:grid-cols-2 gap-3">
        {DEMO_SKILLS.map(s => (
          <Card key={s.name} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--color-surface-2)" }}>
              <Brain className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium font-mono truncate" style={{ color: "var(--color-text)" }}>{s.name}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.category} · {s.calls.toLocaleString()} calls</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: s.status === "active" ? "var(--color-secondary-dim)" : "var(--color-surface-2)",
                color: s.status === "active" ? "var(--color-secondary)" : "var(--color-text-muted)",
              }}>
              {s.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Cost ─────────────────────────────────────────────────────────────────
function CostTab() {
  const d = DEMO_COST_DATA;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Spend This Month", value: `$${d.thisMonth}`,   color: "var(--color-text)"      },
          { label: "Without ClawHQ",   value: `$${d.lastMonth}`,   color: "var(--color-error)"     },
          { label: "Saved MTD",        value: `$${d.saved}`,       color: "var(--color-secondary)" },
          { label: "Reduction",        value: `${d.savedPct}%`,    color: "var(--color-accent)"    },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { icon: Cpu,         label: "Top model",           value: d.topModel,             sub: `$${d.topCost} MTD`           },
          { icon: TrendingDown,label: "Cache hit rate",       value: `${d.cacheHitPct}%`,   sub: "of requests served from cache" },
          { icon: Activity,    label: "Total tokens",        value: d.tokens,               sub: "processed this month"         },
        ].map(({ icon: Icon, label, value, sub }) => (
          <Card key={label} className="flex gap-3">
            <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }} />
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{sub}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Health ───────────────────────────────────────────────────────────────
function HealthTab() {
  return (
    <div className="space-y-3">
      <SectionTitle>Service Health — All systems operational</SectionTitle>
      {DEMO_HEALTH.map(h => (
        <Card key={h.name} className="flex items-center gap-3">
          <StatusDot status={h.status} />
          <p className="flex-1 text-sm font-medium" style={{ color: "var(--color-text)" }}>{h.name}</p>
          <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{h.latency}</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}>
            healthy
          </span>
        </Card>
      ))}
    </div>
  );
}

// ── Main demo page ────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <>
      {bannerVisible && <DemoBanner onDismiss={() => setBannerVisible(false)} />}

      <div className="flex h-screen h-dvh overflow-hidden" style={{
        background: "var(--color-bg)",
        paddingTop: bannerVisible ? "42px" : "0",
      }}>
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r p-4 gap-1"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", color: "#fff" }}>
              C
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}>
              ClawHQ
            </span>
          </div>

          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors"
              style={{
                background: activeTab === tab ? "var(--color-surface-3)" : "transparent",
                color: activeTab === tab ? "var(--color-text)" : "var(--color-text-muted)",
              }}>
              {tab === "Overview" && <Activity className="w-4 h-4" />}
              {tab === "Agents"   && <Bot       className="w-4 h-4" />}
              {tab === "Skills"   && <Brain     className="w-4 h-4" />}
              {tab === "Cost"     && <DollarSign className="w-4 h-4" />}
              {tab === "Health"   && <Shield    className="w-4 h-4" />}
              {tab}
            </button>
          ))}

          {/* CTA at bottom */}
          <div className="mt-auto">
            <a href="https://cal.com/mike-flanigan/clawhq-demo"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--color-primary)", color: "#fff" }}>
              <Calendar className="w-4 h-4" />
              Book a Demo Call
            </a>
            <p className="text-xs text-center mt-2" style={{ color: "var(--color-text-subtle)" }}>
              15 min · free
            </p>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Mobile tab bar */}
          <div className="flex gap-1 mb-6 overflow-x-auto md:hidden">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors"
                style={{
                  background: activeTab === tab ? "var(--color-surface-3)" : "var(--color-surface)",
                  color: activeTab === tab ? "var(--color-text)" : "var(--color-text-muted)",
                  border: `1px solid var(--color-border)`,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Overview" && <OverviewTab />}
          {activeTab === "Agents"   && <AgentsTab />}
          {activeTab === "Skills"   && <SkillsTab />}
          {activeTab === "Cost"     && <CostTab />}
          {activeTab === "Health"   && <HealthTab />}
        </div>
      </div>
    </>
  );
}
