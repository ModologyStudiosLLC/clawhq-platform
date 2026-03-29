"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";

interface ServiceStatus {
  name: string;
  ok: boolean;
  status: "healthy" | "degraded" | "offline";
}

interface HealthData {
  services: ServiceStatus[];
  allHealthy: boolean;
}

const config = {
  healthy: { icon: CheckCircle, color: "var(--color-secondary)", bg: "var(--color-secondary-dim)" },
  degraded: { icon: AlertCircle, color: "var(--color-warning, #f6d969)", bg: "rgba(246,217,105,0.12)" },
  offline: { icon: XCircle, color: "var(--color-error, #ff6b6b)", bg: "rgba(255,107,107,0.12)" },
};

export function SystemAlerts() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = () => {
      fetch("/api/health")
        .then(r => r.json())
        .then(d => { setHealth(d); setLoading(false); })
        .catch(() => setLoading(false));
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-manrope, Manrope)" }}>System Status</h2>
        {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />}
        {!loading && health && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: health.allHealthy ? "var(--color-secondary-dim)" : "rgba(255,107,107,0.12)",
              color: health.allHealthy ? "var(--color-secondary)" : "var(--color-error, #ff6b6b)",
            }}
          >
            {health.allHealthy ? "All systems go" : "Issues detected"}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--color-surface-2)" }} />
          ))
        ) : health?.services.map((svc) => {
          const { icon: Icon, color, bg } = config[svc.status];
          return (
            <div key={svc.name} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{svc.name}</p>
                <p className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>{svc.status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
