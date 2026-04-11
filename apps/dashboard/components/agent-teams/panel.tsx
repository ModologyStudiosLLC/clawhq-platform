"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  GitBranch, Eye, Wrench, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, RefreshCw, Zap, Download, Radio,
  Circle, Loader2,
} from "lucide-react";
import { AGENT_ROLE_META, type AgentRole } from "@/lib/types";
import { useAgentStream } from "@/hooks/use-agent-stream";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamAgent {
  id: string;
  name: string;
  agentRole: AgentRole;
  status: "active" | "idle" | "offline";
  currentTask: string | null;
  lastActivity: string;
  filesModified: number;
  model: string;
}

interface ConflictAlert {
  id: string;
  type: "file-conflict" | "duplicate-task" | "stall";
  severity: "high" | "medium" | "low";
  agentsInvolved: string[];
  description: string;
  detectedAt: string;
  resolved: boolean;
}

interface ObserverSummary {
  generatedAt: string;
  completed: { agentId: string; agentName: string; task: string; filesModified: string[] }[];
  inProgress: { agentId: string; agentName: string; task: string; since: string }[];
  blocked: { agentId: string; agentName: string; reason: string; since: string }[];
  conflicts: ConflictAlert[];
  buildStatus: "passing" | "failing" | "unknown";
  testCount: { pass: number; fail: number } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function roleIcon(role: AgentRole) {
  if (role === "observer") return <Eye size={13} />;
  if (role === "operator") return <ShieldCheck size={13} />;
  return <Wrench size={13} />;
}

function statusDot(status: TeamAgent["status"]) {
  const colors: Record<TeamAgent["status"], string> = {
    active: "var(--color-secondary)",
    idle: "var(--color-text-subtle)",
    offline: "var(--color-error)",
  };
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: colors[status],
        boxShadow: status === "active" ? `0 0 6px ${colors.active}` : "none",
      }}
    />
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AgentRole }) {
  const meta = AGENT_ROLE_META[role];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: meta.dim, color: meta.color, border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)` }}
    >
      {roleIcon(role)}
      {meta.label}
    </span>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: TeamAgent }) {
  const meta = AGENT_ROLE_META[agent.agentRole];
  return (
    <div
      className="card p-4 flex flex-col gap-3 transition-all"
      style={{
        border: `1px solid ${agent.agentRole === "observer"
          ? `color-mix(in srgb, var(--color-secondary) 25%, transparent)`
          : agent.agentRole === "operator"
          ? `color-mix(in srgb, var(--color-warning) 20%, transparent)`
          : "var(--color-border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {statusDot(agent.status)}
          <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {agent.name}
          </span>
        </div>
        <RoleBadge role={agent.agentRole} />
      </div>

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {agent.currentTask
          ? <span style={{ color: "var(--color-text)" }}>{agent.currentTask}</span>
          : <span style={{ opacity: 0.5 }}>idle</span>
        }
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-subtle)" }}>
        <span>{agent.model.split("/").pop()}</span>
        <span>{timeAgo(agent.lastActivity)}</span>
        {agent.filesModified > 0 && (
          <span style={{ color: meta.color }}>{agent.filesModified} files</span>
        )}
      </div>

      {agent.agentRole === "observer" && (
        <div
          className="text-xs px-2 py-1.5 rounded-md"
          style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}
        >
          Read-only · Watching {agent.filesModified} paths
        </div>
      )}
    </div>
  );
}

// ── Conflict alert ────────────────────────────────────────────────────────────

function ConflictRow({ alert }: { alert: ConflictAlert }) {
  const colors = {
    high: "var(--color-error)",
    medium: "var(--color-warning)",
    low: "var(--color-text-muted)",
  };
  const icons = {
    "file-conflict": <GitBranch size={13} />,
    "duplicate-task": <Zap size={13} />,
    stall: <Clock size={13} />,
  };
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm"
      style={{
        background: "var(--color-surface-2)",
        opacity: alert.resolved ? 0.45 : 1,
        border: `1px solid color-mix(in srgb, ${colors[alert.severity]} 20%, transparent)`,
      }}
    >
      <span style={{ color: colors[alert.severity], flexShrink: 0, paddingTop: 2 }}>
        {icons[alert.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
          {alert.description}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
          {alert.agentsInvolved.join(", ")} · {timeAgo(alert.detectedAt)}
          {alert.resolved && " · resolved"}
        </p>
      </div>
      <span
        className="text-xs font-medium capitalize px-1.5 py-0.5 rounded flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${colors[alert.severity]} 12%, transparent)`,
          color: colors[alert.severity],
        }}
      >
        {alert.severity}
      </span>
    </div>
  );
}

// ── Observer summary ──────────────────────────────────────────────────────────

function ObserverSummaryPanel({ summary }: { summary: ObserverSummary }) {
  return (
    <div className="space-y-4">
      {/* Build status */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg"
        style={{
          background: summary.buildStatus === "passing"
            ? "var(--color-secondary-dim)"
            : summary.buildStatus === "failing"
            ? "color-mix(in srgb, var(--color-error) 12%, transparent)"
            : "var(--color-surface-2)",
        }}
      >
        {summary.buildStatus === "passing"
          ? <CheckCircle2 size={15} style={{ color: "var(--color-secondary)" }} />
          : summary.buildStatus === "failing"
          ? <AlertTriangle size={15} style={{ color: "var(--color-error)" }} />
          : <Circle size={15} style={{ color: "var(--color-text-subtle)" }} />
        }
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          Build {summary.buildStatus}
          {summary.testCount && ` · ${summary.testCount.pass} passing, ${summary.testCount.fail} failing`}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--color-text-subtle)" }}>
          Synthesized {timeAgo(summary.generatedAt)}
        </span>
      </div>

      {/* In progress */}
      {summary.inProgress.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-subtle)" }}>
            In progress
          </p>
          <div className="space-y-1.5">
            {summary.inProgress.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--color-surface-2)" }}>
                <Loader2 size={13} className="animate-spin flex-shrink-0" style={{ color: "var(--color-primary)" }} />
                <span style={{ color: "var(--color-text)" }}>{item.agentName}</span>
                <span className="flex-1 truncate" style={{ color: "var(--color-text-muted)" }}>{item.task}</span>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>{timeAgo(item.since)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {summary.completed.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-subtle)" }}>
            Completed this cycle
          </p>
          <div className="space-y-1.5">
            {summary.completed.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--color-surface-2)" }}>
                <CheckCircle2 size={13} style={{ color: "var(--color-secondary)", flexShrink: 0 }} />
                <span style={{ color: "var(--color-text)" }}>{item.agentName}</span>
                <span className="flex-1 truncate" style={{ color: "var(--color-text-muted)" }}>{item.task}</span>
                {item.filesModified.length > 0 && (
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>
                    {item.filesModified.length} files
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked */}
      {summary.blocked.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-warning)" }}>
            Blocked
          </p>
          <div className="space-y-1.5">
            {summary.blocked.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                style={{ background: "color-mix(in srgb, var(--color-warning) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)" }}>
                <Clock size={13} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                <span style={{ color: "var(--color-text)" }}>{item.agentName}</span>
                <span className="flex-1 truncate" style={{ color: "var(--color-text-muted)" }}>{item.reason}</span>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)" }}>{timeAgo(item.since)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mock data (replaced by /api/agent-teams once live) ────────────────────────

function mockData(): { agents: TeamAgent[]; summary: ObserverSummary; conflicts: ConflictAlert[] } {
  const now = new Date().toISOString();
  const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

  const agents: TeamAgent[] = [
    { id: "observer-1", name: "Observer", agentRole: "observer", status: "active", currentTask: "Synthesizing team state across 3 worktrees", lastActivity: minsAgo(1), filesModified: 0, model: "anthropic/claude-haiku-4-5-20251001" },
    { id: "conflict-1", name: "Conflict Detector", agentRole: "observer", status: "idle", currentTask: null, lastActivity: minsAgo(3), filesModified: 0, model: "anthropic/claude-haiku-4-5-20251001" },
    { id: "worker-fe", name: "Frontend Agent", agentRole: "worker", status: "active", currentTask: "Building /agent-teams UI components", lastActivity: minsAgo(0), filesModified: 4, model: "anthropic/claude-sonnet-4-6" },
    { id: "worker-be", name: "Backend Agent", agentRole: "worker", status: "active", currentTask: "Writing /api/agent-teams route handler", lastActivity: minsAgo(2), filesModified: 2, model: "anthropic/claude-sonnet-4-6" },
    { id: "worker-test", name: "Test Agent", agentRole: "worker", status: "idle", currentTask: null, lastActivity: minsAgo(8), filesModified: 0, model: "anthropic/claude-haiku-4-5-20251001" },
    { id: "operator-1", name: "Deploy Operator", agentRole: "operator", status: "idle", currentTask: null, lastActivity: minsAgo(22), filesModified: 0, model: "anthropic/claude-sonnet-4-6" },
  ];

  const summary: ObserverSummary = {
    generatedAt: minsAgo(1),
    inProgress: [
      { agentId: "worker-fe", agentName: "Frontend Agent", task: "Building agent-teams panel component", since: minsAgo(14) },
      { agentId: "worker-be", agentName: "Backend Agent", task: "Writing API route for /api/agent-teams", since: minsAgo(9) },
    ],
    completed: [
      { agentId: "worker-fe", agentName: "Frontend Agent", task: "Added AgentRole types to lib/types.ts", filesModified: ["lib/types.ts"] },
      { agentId: "worker-be", agentName: "Backend Agent", task: "Scaffolded observer-pack.yaml", filesModified: ["packs/observer-pack.yaml"] },
    ],
    blocked: [],
    conflicts: [],
    buildStatus: "passing",
    testCount: { pass: 24, fail: 0 },
  };

  const conflicts: ConflictAlert[] = [
    { id: "c1", type: "file-conflict", severity: "high", agentsInvolved: ["Frontend Agent", "Backend Agent"], description: "Both agents modified lib/types.ts within 2 minutes of each other", detectedAt: minsAgo(6), resolved: true },
  ];

  return { agents, summary, conflicts };
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AgentTeamsPanel() {
  const { agents: streamAgents, connected } = useAgentStream();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date().toISOString());

  // Use mock data for now; swap for /api/agent-teams when route is live
  const { agents, summary, conflicts } = mockData();

  const activeCount = agents.filter(a => a.status === "active").length;
  const observerCount = agents.filter(a => a.agentRole === "observer").length;
  const workerCount = agents.filter(a => a.agentRole === "worker").length;
  const operatorCount = agents.filter(a => a.agentRole === "operator").length;
  const openConflicts = conflicts.filter(c => !c.resolved).length;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setLastRefresh(new Date().toISOString());
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">

      {/* Header bar */}
      <div
        className="card px-5 py-4 flex items-center gap-4"
        style={{ border: `1px solid ${openConflicts > 0 ? "color-mix(in srgb, var(--color-error) 30%, transparent)" : "color-mix(in srgb, var(--color-secondary) 25%, transparent)"}` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: openConflicts > 0 ? "color-mix(in srgb, var(--color-error) 12%, transparent)" : "var(--color-secondary-dim)" }}
        >
          <GitBranch size={20} style={{ color: openConflicts > 0 ? "var(--color-error)" : "var(--color-secondary)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {openConflicts > 0 ? `${openConflicts} conflict${openConflicts > 1 ? "s" : ""} need attention` : "Team running clean"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {activeCount} active · {workerCount} worker{workerCount !== 1 ? "s" : ""} · {observerCount} observer{observerCount !== 1 ? "s" : ""} · {operatorCount} operator{operatorCount !== 1 ? "s" : ""}
            &nbsp;·&nbsp;
            <span style={{ color: connected ? "var(--color-secondary)" : "var(--color-text-subtle)" }}>
              {connected ? "live" : "polling"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <a
            href="/api/packs/observer-pack"
            download="observer-pack.yaml"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}
          >
            <Download size={13} />
            Observer Pack
          </a>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {(["worker", "observer", "operator"] as AgentRole[]).map(role => {
          const meta = AGENT_ROLE_META[role];
          return (
            <div key={role} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <span style={{ color: meta.color }}>{roleIcon(role)}</span>
              <span className="font-medium" style={{ color: "var(--color-text)" }}>{meta.label}</span>
              <span style={{ color: "var(--color-text-subtle)" }}>—</span>
              <span style={{ color: "var(--color-text-muted)" }}>{meta.description}</span>
            </div>
          );
        })}
      </div>

      {/* Agent grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
          Team Roster
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>
      </div>

      {/* Observer summary */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} style={{ color: "var(--color-secondary)" }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
            Observer Synthesis
          </h2>
          <span className="ml-auto text-xs" style={{ color: "var(--color-text-subtle)" }}>
            auto-refreshes every 10 min
          </span>
        </div>
        <ObserverSummaryPanel summary={summary} />
      </div>

      {/* Conflict log */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} style={{ color: openConflicts > 0 ? "var(--color-error)" : "var(--color-text-muted)" }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}>
            Conflict Log
          </h2>
          {openConflicts === 0 && (
            <span
              className="ml-auto flex items-center gap-1 text-xs"
              style={{ color: "var(--color-secondary)" }}
            >
              <CheckCircle2 size={12} /> Clean
            </span>
          )}
        </div>
        {conflicts.length === 0 ? (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}
          >
            <CheckCircle2 size={15} />
            No conflicts detected in this session
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map(c => <ConflictRow key={c.id} alert={c} />)}
          </div>
        )}
      </div>

      {/* Observer Pack info */}
      <div
        className="card px-5 py-4"
        style={{ border: "1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent)" }}
      >
        <div className="flex items-start gap-3">
          <Eye size={16} style={{ color: "var(--color-secondary)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              Deploy the Observer Pack to go live
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              The data above will be populated by real observer agents once you install the Observer Pack.
              Download the YAML and import it in Packs — it deploys three agents: Observer (10-min cycle),
              Conflict Detector (3-min scan), and Status Reporter (on-demand).
            </p>
            <code
              className="block text-xs font-mono px-3 py-2 rounded-lg"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            >
              minAgentsToActivate: 2 · observer: read-only · conflicts: #agent-alerts
            </code>
          </div>
        </div>
      </div>

    </div>
  );
}
