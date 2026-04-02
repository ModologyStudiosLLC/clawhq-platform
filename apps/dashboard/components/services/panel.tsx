"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  MemoryStick,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import type { ContainerSummary } from "@/lib/docker";
import { LogDrawer } from "./log-drawer";

// ─── ServiceCard ────────────────────────────────────────────────────────────

interface ServiceCardProps {
  container: ContainerSummary;
  onRestart: (name: string) => Promise<void>;
  onLogs: (name: string) => void;
}

function StatusDot({ status }: { status: ContainerSummary["status"] }) {
  const color =
    status === "running"
      ? "var(--color-primary)"
      : status === "restarting"
        ? "#f59e0b"
        : "var(--color-error, #ef4444)";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={status}
    />
  );
}

function ServiceCard({ container, onRestart, onLogs }: ServiceCardProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const memPct =
    container.memoryLimitMb > 0
      ? Math.min(100, (container.memoryMb / container.memoryLimitMb) * 100)
      : 0;

  async function handleRestartClick() {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 4000);
      return;
    }
    setConfirmRestart(false);
    setRestarting(true);
    await onRestart(container.serviceName);
    setRestarting(false);
  }

  return (
    <div
      className="rounded-xl p-4 border transition-all"
      style={{
        background: "var(--color-surface-2)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={container.status} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
              {container.serviceName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>
              {container.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onLogs(container.serviceName)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Terminal size={11} />
            Logs
          </button>
          <button
            onClick={handleRestartClick}
            disabled={restarting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{
              background: confirmRestart ? "var(--color-error, #ef4444)" : "var(--color-surface)",
              color: confirmRestart ? "#fff" : "var(--color-text-muted)",
              border: `1px solid ${confirmRestart ? "transparent" : "var(--color-border)"}`,
              opacity: restarting ? 0.6 : 1,
            }}
          >
            <RefreshCw size={11} className={restarting ? "animate-spin" : ""} />
            {restarting ? "…" : confirmRestart ? "Confirm?" : "Restart"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs mb-3" style={{ color: "var(--color-text-subtle)" }}>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {container.uptime || "—"}
        </span>
        <span className="flex items-center gap-1">
          <Cpu size={10} />
          {container.cpuPercent > 0 ? `${container.cpuPercent}%` : "—"}
        </span>
        {container.exitCode !== null && container.exitCode !== 0 && (
          <span className="flex items-center gap-1" style={{ color: "var(--color-error, #ef4444)" }}>
            <AlertCircle size={10} />
            exit {container.exitCode}
          </span>
        )}
        {container.status === "running" && container.exitCode === 0 && (
          <span className="flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
            <CheckCircle size={10} />
            healthy
          </span>
        )}
      </div>

      {/* Memory bar */}
      {container.memoryLimitMb > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
              <MemoryStick size={10} />
              Memory
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {container.memoryMb} / {container.memoryLimitMb} MB
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${memPct}%`,
                background: memPct > 80 ? "var(--color-error, #ef4444)" : "var(--color-primary)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ServicesPanel ───────────────────────────────────────────────────────────

export function ServicesPanel() {
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logService, setLogService] = useState<string | null>(null);

  const fetchContainers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setContainers(data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + poll every 15s
  useEffect(() => {
    fetchContainers();
    const interval = setInterval(() => fetchContainers(), 15_000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  // Subscribe to Docker events via SSE
  useEffect(() => {
    const es = new EventSource("/api/services/events/stream");
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "container.die" && data.exitCode !== 0) {
          toast.error(`${data.service} crashed (exit ${data.exitCode})`);
        }
        // Refresh on any start/die/restart
        if (["container.start", "container.die", "container.restart"].includes(data.type)) {
          fetchContainers();
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [fetchContainers]);

  async function handleRestart(name: string) {
    try {
      const res = await fetch(`/api/services/${encodeURIComponent(name)}/restart`, {
        method: "POST",
      });
      if (res.status === 429) {
        toast.error("Rate limited — wait 30s between restarts");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Restart failed");
        return;
      }
      toast.success(`${name} restarting…`);
      setTimeout(() => fetchContainers(), 2000);
    } catch {
      toast.error("Network error — could not restart");
    }
  }

  const dockerUnavailable = !loading && containers.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-primary-dim)" }}
          >
            <Box size={16} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Services
            </h1>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {loading ? "Loading…" : `${containers.length} container${containers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchContainers(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Docker unavailable notice */}
      {dockerUnavailable && (
        <div
          className="rounded-xl p-6 border text-center"
          style={{
            background: "var(--color-surface-2)",
            borderColor: "var(--color-border)",
          }}
        >
          <Box size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-subtle)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
            Docker proxy not running
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-subtle)" }}>
            The Services UI requires the docker-proxy service. Start it with:
          </p>
          <pre
            className="inline-block px-4 py-2 rounded-lg text-xs text-left"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            docker compose --profile services-ui up -d docker-proxy
          </pre>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 border animate-pulse"
              style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", height: 120 }}
            />
          ))}
        </div>
      )}

      {/* Container grid */}
      {!loading && containers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {containers.map((c) => (
            <ServiceCard
              key={c.id}
              container={c}
              onRestart={handleRestart}
              onLogs={(name) => setLogService(name)}
            />
          ))}
        </div>
      )}

      {/* Log drawer */}
      <LogDrawer
        service={logService || ""}
        open={!!logService}
        onClose={() => setLogService(null)}
      />
    </div>
  );
}
