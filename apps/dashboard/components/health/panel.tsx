"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Download, Activity, Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthPoint {
  ts: number;
  ok: boolean;
  latencyMs: number;
}

interface HistoryResponse {
  history: Record<string, HealthPoint[]>;
  services: string[];
}

interface ServiceStatus {
  name: string;
  ok: boolean;
  status: string;
}

interface HealthResponse {
  services: ServiceStatus[];
  allHealthy: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uptime(points: HealthPoint[]): number {
  if (!points.length) return 0;
  return Math.round((points.filter(p => p.ok).length / points.length) * 1000) / 10;
}

function avgLatency(points: HealthPoint[]): number {
  const ok = points.filter(p => p.ok);
  if (!ok.length) return 0;
  return Math.round(ok.reduce((s, p) => s + p.latencyMs, 0) / ok.length);
}

function timeSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points }: { points: HealthPoint[] }) {
  const W = 120;
  const H = 24;
  const last30 = points.slice(-30);

  if (!last30.length) {
    return <div style={{ width: W, height: H, opacity: 0.3, fontSize: 10, color: "var(--color-text-muted)", lineHeight: `${H}px` }}>no data</div>;
  }

  const maxLat = Math.max(...last30.map(p => p.latencyMs), 1);
  const barW = W / last30.length;

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      {last30.map((p, i) => {
        const h = p.ok ? Math.max(3, Math.round((p.latencyMs / maxLat) * (H - 4))) : H;
        const color = p.ok ? "var(--color-secondary)" : "var(--color-error)";
        return (
          <rect
            key={i}
            x={i * barW + 1}
            y={H - h}
            width={Math.max(barW - 2, 1)}
            height={h}
            fill={color}
            opacity={0.7}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({
  name,
  status,
  points,
}: {
  name: string;
  status: ServiceStatus | undefined;
  points: HealthPoint[];
}) {
  const ok = status?.ok ?? (points.length ? points[points.length - 1].ok : false);
  const last = points[points.length - 1];
  const up = uptime(points);
  const lat = avgLatency(points);

  const dotColor = ok ? "var(--color-secondary)" : status?.status === "degraded" ? "var(--color-warning)" : "var(--color-error)";

  return (
    <div
      className="card p-4 transition-all"
      style={{ border: `1px solid ${ok ? "var(--color-border)" : "rgba(255,107,107,0.3)"}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: dotColor,
              boxShadow: ok ? `0 0 6px ${dotColor}` : "none",
            }}
          />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {name}
          </span>
        </div>
        <span
          className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
          style={{
            background: ok ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.15)",
            color: ok ? "var(--color-secondary)" : "var(--color-error)",
          }}
        >
          {status?.status ?? (ok ? "healthy" : "offline")}
        </span>
      </div>

      <Sparkline points={points} />

      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>{up}% uptime</span>
        <span>{lat > 0 ? `${lat}ms avg` : "—"}</span>
        {last && <span>{timeSince(last.ts)}</span>}
      </div>
    </div>
  );
}

// ── Incident log ──────────────────────────────────────────────────────────────

function IncidentLog({ history }: { history: Record<string, HealthPoint[]> }) {
  const incidents: { service: string; ts: number; type: "down" | "recovered" }[] = [];

  for (const [name, points] of Object.entries(history)) {
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev.ok && !curr.ok) incidents.push({ service: name, ts: curr.ts, type: "down" });
      if (!prev.ok && curr.ok) incidents.push({ service: name, ts: curr.ts, type: "recovered" });
    }
  }

  incidents.sort((a, b) => b.ts - a.ts);
  const recent = incidents.slice(0, 10);

  if (!recent.length) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
        style={{ background: "var(--color-secondary-dim)", color: "var(--color-secondary)" }}
      >
        <CheckCircle size={15} />
        No incidents in the current window
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {recent.map((inc, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: "var(--color-surface-2)" }}
        >
          {inc.type === "down" ? (
            <WifiOff size={14} style={{ color: "var(--color-error)", flexShrink: 0 }} />
          ) : (
            <Wifi size={14} style={{ color: "var(--color-secondary)", flexShrink: 0 }} />
          )}
          <span style={{ color: "var(--color-text)" }}>{inc.service}</span>
          <span style={{ color: "var(--color-text-muted)" }}>
            {inc.type === "down" ? "went offline" : "recovered"}
          </span>
          <span className="ml-auto" style={{ color: "var(--color-text-subtle)" }}>
            {timeSince(inc.ts)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function HealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [histData, setHistData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (force = false) => {
    try {
      const [hr, histR] = await Promise.all([
        fetch("/api/health").then(r => r.json()),
        fetch(force ? "/api/health/history" : "/api/health/history", {
          method: force ? "POST" : "GET",
        }).then(r => r.json()),
      ]);
      setHealth(hr);
      setHistData(histR);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  async function probe() {
    setProbing(true);
    await fetchAll(true);
    setProbing(false);
  }

  const services = histData?.services ?? [];
  const allOk = health?.allHealthy ?? false;
  const statusMap = Object.fromEntries((health?.services ?? []).map(s => [s.name, s]));

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Summary bar */}
      <div
        className="card px-5 py-4 flex items-center gap-4"
        style={{ border: `1px solid ${allOk ? "rgba(105,246,184,0.3)" : "rgba(255,107,107,0.3)"}` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: allOk ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.15)" }}
        >
          {allOk
            ? <CheckCircle size={20} style={{ color: "var(--color-secondary)" }} />
            : <AlertTriangle size={20} style={{ color: "var(--color-error)" }} />
          }
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {allOk ? "All systems operational" : "One or more services degraded"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {services.length} services monitored · auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={probe}
            disabled={probing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
          >
            <RefreshCw size={13} className={probing ? "animate-spin" : ""} />
            Probe now
          </button>
          <a
            href="/api/health/agent"
            download="clawhq-health-monitor.yaml"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)", border: "1px solid rgba(105,218,255,0.25)" }}
          >
            <Download size={13} />
            Agent YAML
          </a>
        </div>
      </div>

      {/* Service grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map(name => (
            <ServiceCard
              key={name}
              name={name}
              status={statusMap[name]}
              points={histData?.history[name] ?? []}
            />
          ))}
        </div>
      )}

      {/* Incident log */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: "var(--color-text-muted)" }} />
          <h2
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-display)" }}
          >
            Recent Events
          </h2>
        </div>
        {histData && <IncidentLog history={histData.history} />}
      </div>

      {/* AgentPack info card */}
      <div
        className="card px-5 py-4"
        style={{ border: "1px solid rgba(105,218,255,0.2)" }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
          Automated health monitoring
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          Download the AgentPack YAML and import it into Paperclip to enable a scheduled agent that checks
          all endpoints every 5 minutes and sends a Clawhip alert if any service goes down.
        </p>
        <code
          className="block text-xs font-mono px-3 py-2 rounded-lg"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
        >
          trigger: schedule · cron: */5 * * * * · model: claude-haiku-4-5-20251001
        </code>
      </div>
    </div>
  );
}
