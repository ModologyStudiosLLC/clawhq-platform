"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, Clock, Loader2, RotateCcw,
  Zap, DollarSign, Activity, ListTodo, RefreshCw, Plus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  agent: string | null;
  service: string;
  status: "queued" | "assigned" | "running" | "completed" | "failed" | "archived";
  priority: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: string | null;
  error: string | null;
  cost_usd: number | null;
  tokens_used: number | null;
  model: string | null;
  retries: number;
}

interface Stats {
  total_tasks: number;
  by_status: Record<string, number>;
  total_cost_usd: number;
  total_tokens: number;
  avg_cost_per_task_usd: number;
  completed_tasks: number;
}

interface ServiceHealth {
  name: string;
  ok: boolean;
  status: string;
  latency_ms: number | null;
}

interface HealthData {
  ok: boolean;
  services: ServiceHealth[];
  checked_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  queued:    { label: "Queued",    color: "var(--color-text-muted)",   icon: <Clock size={12} /> },
  assigned:  { label: "Assigned",  color: "var(--color-accent)",       icon: <Zap size={12} /> },
  running:   { label: "Running",   color: "var(--color-primary)",      icon: <Loader2 size={12} className="animate-spin" /> },
  completed: { label: "Done",      color: "var(--color-secondary)",    icon: <CheckCircle2 size={12} /> },
  failed:    { label: "Failed",    color: "var(--color-error)",        icon: <XCircle size={12} /> },
  archived:  { label: "Archived",  color: "var(--color-text-subtle)",  icon: <RotateCcw size={12} /> },
};

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "var(--color-text-muted)", icon: null };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ServiceDot({ ok, name }: { ok: boolean; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: ok ? "var(--color-secondary)" : "var(--color-error)",
          boxShadow: ok ? "0 0 4px var(--color-secondary)" : undefined,
        }}
      />
      <span className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>{name}</span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, sub }: { icon: React.ReactNode; value: string | number; label: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: "1rem" }}>
      <div className="flex items-start justify-between mb-2">
        <div style={{ color: "var(--color-text-muted)" }}>{icon}</div>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>{sub}</p>}
    </div>
  );
}

// ── New task modal (inline) ───────────────────────────────────────────────────

function NewTaskBar({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [agent, setAgent] = useState("");
  const [service, setService] = useState("openfang");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/orchestration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), agent: agent || undefined, service }),
      });
      setTitle(""); setAgent(""); setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
        style={{
          background: "var(--color-primary)",
          color: "#fff",
        }}
      >
        <Plus size={14} />
        New Task
      </button>
    );
  }

  return (
    <div className="card flex items-center gap-3 p-3 animate-fade-in">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Task title..."
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: "var(--color-text)", minWidth: 0 }}
      />
      <input
        value={agent}
        onChange={e => setAgent(e.target.value)}
        placeholder="Agent (optional)"
        className="bg-transparent text-sm outline-none w-36"
        style={{ color: "var(--color-text)" }}
      />
      <select
        value={service}
        onChange={e => setService(e.target.value)}
        className="bg-transparent text-xs outline-none"
        style={{ color: "var(--color-text-muted)" }}
      >
        <option value="openfang">OpenFang</option>
        <option value="hermes">Hermes</option>
        <option value="paperclip">Paperclip</option>
      </select>
      <button
        onClick={submit}
        disabled={submitting || !title.trim()}
        className="px-3 py-1 rounded text-xs font-medium"
        style={{ background: "var(--color-primary)", color: "#fff", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "..." : "Create"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        Cancel
      </button>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  async function archive() {
    await fetch(`/api/orchestration/${task.id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <div
      className="border-b last:border-b-0 cursor-pointer"
      style={{ borderColor: "var(--color-border)" }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
        {/* Status */}
        <StatusBadge status={task.status} />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
            {task.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
            {task.agent ? `${task.agent} · ` : ""}{task.service} · {relTime(task.created_at)}
          </p>
        </div>

        {/* Cost */}
        {task.cost_usd != null && (
          <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            ${task.cost_usd.toFixed(4)}
          </span>
        )}

        {/* ID */}
        <span className="text-xs font-mono" style={{ color: "var(--color-text-subtle)" }}>
          {task.id}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2" onClick={e => e.stopPropagation()}>
          {task.result && (
            <div
              className="text-xs rounded-lg p-3 font-mono leading-relaxed"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}
            >
              {task.result}
            </div>
          )}
          {task.error && (
            <div
              className="text-xs rounded-lg p-3 font-mono"
              style={{ background: "color-mix(in srgb, var(--color-error) 8%, transparent)", color: "var(--color-error)" }}
            >
              {task.error}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-subtle)" }}>
            {task.tokens_used && <span>{task.tokens_used.toLocaleString()} tokens</span>}
            {task.model && <span>{task.model}</span>}
            {task.started_at && <span>Started {relTime(task.started_at)}</span>}
            {task.completed_at && <span>Completed {relTime(task.completed_at)}</span>}
          </div>
          {task.status !== "archived" && (
            <button
              onClick={archive}
              className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--color-text-subtle)", background: "var(--color-surface-2)" }}
            >
              Archive
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type Filter = "all" | "queued" | "running" | "completed" | "failed";

export function OrchestrationPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [tasksRes, statsRes, healthRes] = await Promise.all([
        fetch("/api/orchestration").then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch("/api/orchestration/stats").then(r => r.json()).catch(() => null),
        fetch("/api/orchestration/health").then(r => r.json()).catch(() => null),
      ]);
      setTasks(tasksRes.tasks ?? []);
      setStats(statsRes);
      setHealth(healthRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 15s for running tasks
  useEffect(() => {
    const interval = setInterval(() => {
      if (tasks.some(t => t.status === "running" || t.status === "queued")) load();
    }, 15_000);
    return () => clearInterval(interval);
  }, [tasks, load]);

  const filtered = filter === "all"
    ? tasks.filter(t => t.status !== "archived")
    : tasks.filter(t => t.status === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "queued", label: "Queued" },
    { key: "running", label: "Running" },
    { key: "completed", label: "Done" },
    { key: "failed", label: "Failed" },
  ];

  const unreachable = !health && !loading;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Task coordination layer across Hermes, OpenFang, and Paperclip.
        </p>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Service health bar */}
      <div className="card" style={{ padding: "1rem" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
            Services
          </p>
          {health && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: health.ok
                  ? "color-mix(in srgb, var(--color-secondary) 12%, transparent)"
                  : "color-mix(in srgb, var(--color-warning) 12%, transparent)",
                color: health.ok ? "var(--color-secondary)" : "var(--color-warning)",
              }}
            >
              {health.ok ? "All healthy" : "Degraded"}
            </span>
          )}
          {unreachable && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--color-error) 12%, transparent)", color: "var(--color-error)" }}>
              Orchestration offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          {health?.services.map(s => (
            <div key={s.name} className="flex items-center gap-3">
              <ServiceDot ok={s.ok} name={s.name} />
              {s.latency_ms != null && (
                <span className="text-xs font-mono" style={{ color: "var(--color-text-subtle)" }}>{s.latency_ms}ms</span>
              )}
            </div>
          )) ?? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-surface-2)" }} />
                <div className="h-3 w-16 rounded animate-pulse" style={{ background: "var(--color-surface-2)" }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<ListTodo size={16} />} value={stats.total_tasks} label="Total tasks" />
          <StatCard icon={<Activity size={16} />} value={stats.completed_tasks} label="Completed" sub={`${stats.by_status.failed ?? 0} failed`} />
          <StatCard icon={<DollarSign size={16} />} value={`$${stats.total_cost_usd.toFixed(3)}`} label="Total cost" sub={`$${stats.avg_cost_per_task_usd.toFixed(4)} avg/task`} />
          <StatCard icon={<Zap size={16} />} value={(stats.total_tokens / 1000).toFixed(1) + "K"} label="Tokens used" />
        </div>
      )}

      {/* Task queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {/* Filters */}
          <div className="flex items-center gap-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: filter === f.key ? "var(--color-primary)" : "var(--color-surface-2)",
                  color: filter === f.key ? "#fff" : "var(--color-text-muted)",
                }}
              >
                {f.label}
                {f.key !== "all" && stats?.by_status[f.key] ? (
                  <span className="ml-1.5 opacity-70">{stats.by_status[f.key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <NewTaskBar onCreated={() => load()} />
        </div>

        {/* Table */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: "var(--color-surface-2)" }} />
                  <div className="h-4 flex-1 rounded animate-pulse" style={{ background: "var(--color-surface-2)" }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                {filter === "all" ? "No tasks yet. Create one to get started." : `No ${filter} tasks.`}
              </p>
            </div>
          ) : (
            filtered.map(task => (
              <TaskRow key={task.id} task={task} onUpdate={() => load()} />
            ))
          )}
        </div>
      </div>

    </div>
  );
}
