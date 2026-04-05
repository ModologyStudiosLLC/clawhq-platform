"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, Zap, AlertTriangle, Clock, Activity, Eye, RefreshCw } from "lucide-react";

interface SentinelStatus {
  active: boolean;
  lockdown: boolean;
  blocked_ips: number;
  alert_channels: number;
  canary: {
    total_canaries: number;
    triggered: number;
    healthy: number;
    by_type: Record<string, number>;
  };
  decoy: {
    total_decoys: number;
    total_interactions: number;
    decoy_names: string[];
  };
  detector: Record<string, unknown>;
  error?: string;
}

interface SecurityEvent {
  event_type: string;
  severity: string;
  source_ip?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

interface DecoyInteraction {
  timestamp: string;
  agent: string;
  source_ip: string;
  user_id: string;
  message: string;
  keywords: string[];
}

interface EventsData {
  active: boolean;
  events: SecurityEvent[];
  decoy_interactions: DecoyInteraction[];
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  info:      { color: "var(--color-text-muted)", bg: "var(--color-surface-2)", dot: "var(--color-text-subtle)" },
  warning:   { color: "#d97706", bg: "rgba(217,119,6,0.08)", dot: "#d97706" },
  high:      { color: "#ea580c", bg: "rgba(234,88,12,0.08)", dot: "#ea580c" },
  critical:  { color: "#dc2626", bg: "rgba(220,38,38,0.10)", dot: "#dc2626" },
  emergency: { color: "#9333ea", bg: "rgba(147,51,234,0.10)", dot: "#9333ea" },
};

function StatusDot({ active, pulse = false }: { active: boolean; pulse?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: active ? "#22c55e" : "var(--color-text-subtle)",
        flexShrink: 0,
        boxShadow: active && pulse ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
      }}
    />
  );
}

function StatCard({ label, value, sub, icon: Icon, alert = false }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; alert?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        borderColor: alert ? "rgba(220,38,38,0.35)" : undefined,
        background: alert ? "rgba(220,38,38,0.04)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="text-xs" style={{ color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </span>
        <Icon size={14} style={{ color: alert ? "#dc2626" : "var(--color-text-subtle)" }} />
      </div>
      <div>
        <div
          className="text-2xl font-bold"
          style={{
            color: alert ? "#dc2626" : "var(--color-text)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: SecurityEvent }) {
  const sev = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info;
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "10px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: "transparent",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: sev.dot,
          flexShrink: 0,
          marginTop: "5px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <span
            className="text-xs font-semibold"
            style={{
              background: sev.bg,
              color: sev.color,
              padding: "1px 7px",
              borderRadius: "var(--radius-full)",
              letterSpacing: "0.02em",
            }}
          >
            {event.severity.toUpperCase()}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
            {event.event_type.replace(/_/g, " ")}
          </span>
        </div>
        {event.source_ip && event.source_ip !== "unknown" && (
          <span className="text-xs" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono, monospace)" }}>
            {event.source_ip}
          </span>
        )}
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-subtle)", fontFamily: "var(--font-mono, monospace)" }}>
        {time}
      </span>
    </div>
  );
}

export default function SecurityPage() {
  const [status, setStatus] = useState<SentinelStatus | null>(null);
  const [events, setEvents] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch("/api/sentinel?endpoint=status"),
        fetch("/api/sentinel?endpoint=events&limit=50"),
      ]);
      const [s, e] = await Promise.all([statusRes.json(), eventsRes.json()]);
      setStatus(s);
      setEvents(e);
      setLastRefresh(new Date());
    } catch {
      setStatus({ active: false, lockdown: false, blocked_ips: 0, alert_channels: 0, canary: { total_canaries: 0, triggered: 0, healthy: 0, by_type: {} }, decoy: { total_decoys: 0, total_interactions: 0, decoy_names: [] }, detector: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const isActive = status?.active ?? false;
  const isLockdown = status?.lockdown ?? false;
  const canaryTriggered = status?.canary?.triggered ?? 0;

  const ShieldIcon = isLockdown ? ShieldAlert : isActive ? ShieldCheck : ShieldOff;

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldIcon
            size={20}
            style={{
              color: isLockdown ? "#dc2626" : isActive ? "#22c55e" : "var(--color-text-subtle)",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {isLockdown ? "LOCKDOWN ACTIVE" : isActive ? "Sentinel Active" : "Sentinel Offline"}
              </span>
              <StatusDot active={isActive} pulse={isActive} />
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              6-layer AI security: gate, prompt guard, tool guard, canary, decoy swarm, shield
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {/* Lockdown banner */}
      {isLockdown && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertTriangle size={15} style={{ color: "#dc2626", flexShrink: 0 }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>Lockdown Mode Active</span>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              All non-whitelisted access is blocked. A canary token was used externally — this indicates confirmed compromise. Manual review required to exit lockdown.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "20px", height: "88px", background: "var(--color-surface-2)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Canary Tokens"
            value={status?.canary?.healthy ?? 0}
            sub={`${status?.canary?.total_canaries ?? 0} total`}
            icon={Activity}
            alert={canaryTriggered > 0}
          />
          <StatCard
            label="Blocked IPs"
            value={status?.blocked_ips ?? 0}
            sub="auto-blocked"
            icon={ShieldAlert}
            alert={(status?.blocked_ips ?? 0) > 0}
          />
          <StatCard
            label="Decoy Agents"
            value={status?.decoy?.total_decoys ?? 0}
            sub={`${status?.decoy?.total_interactions ?? 0} interactions`}
            icon={Eye}
          />
          <StatCard
            label="Alert Channels"
            value={status?.alert_channels ?? 0}
            sub="discord · slack · email"
            icon={Zap}
          />
        </div>
      )}

      {/* Canary + Decoy side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Canary token health */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Activity size={13} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Canary Tokens</span>
          </div>
          {status?.canary?.by_type && Object.keys(status.canary.by_type).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(status.canary.by_type).map(([type, count]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)", textTransform: "capitalize" }}>
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-text)", fontFamily: "var(--font-mono, monospace)" }}>
                    {count as number}
                  </span>
                </div>
              ))}
              {canaryTriggered > 0 && (
                <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(220,38,38,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <span className="text-xs font-semibold" style={{ color: "#dc2626" }}>
                    ⚠ {canaryTriggered} token{canaryTriggered !== 1 ? "s" : ""} triggered — possible compromise
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {isActive ? "No canary data available." : "Sentinel offline — start Hermes to activate."}
            </p>
          )}
        </div>

        {/* Decoy agents */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Eye size={13} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Honeypot Agents</span>
          </div>
          {status?.decoy?.decoy_names && status.decoy.decoy_names.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {status.decoy.decoy_names.map((name) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                    {name}
                  </span>
                </div>
              ))}
              <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
                {status.decoy.total_interactions} total probes logged
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {isActive ? "No decoy agents configured." : "Sentinel offline."}
            </p>
          )}
        </div>
      </div>

      {/* Event feed */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={13} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Security Events</span>
          </div>
          <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
            Last updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>Loading events…</span>
          </div>
        ) : events?.events && events.events.length > 0 ? (
          <div>
            {events.events.slice(0, 30).map((event, i) => (
              <EventRow key={i} event={event} />
            ))}
          </div>
        ) : events?.decoy_interactions && events.decoy_interactions.length > 0 ? (
          <div>
            {events.decoy_interactions.map((interaction, i) => (
              <EventRow
                key={i}
                event={{
                  event_type: `decoy_probe → ${interaction.agent}`,
                  severity: "warning",
                  source_ip: interaction.source_ip,
                  timestamp: interaction.timestamp,
                  details: { keywords: interaction.keywords },
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <ShieldCheck size={24} style={{ color: "var(--color-text-subtle)", margin: "0 auto 10px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {isActive ? "No threats detected. All clear." : "Sentinel is offline. Start the Hermes service to activate."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
