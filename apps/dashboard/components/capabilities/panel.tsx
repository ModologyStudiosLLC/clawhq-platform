"use client";

import { useEffect, useState } from "react";

interface Hand {
  id: string;
  name: string;
  icon: string;
  description: string;
  active: boolean;
  requirements_met: boolean;
  degraded: boolean;
  category: string;
}

const categoryLabel: Record<string, string> = {
  data: "Data & Research",
  content: "Content",
  productivity: "Productivity",
  communication: "Communication",
};

// Per-category accent color for card top border
const categoryColor: Record<string, string> = {
  data: "var(--color-primary)",
  content: "var(--color-secondary)",
  productivity: "var(--color-accent)",
  communication: "var(--color-warning)",
};

export function CapabilitiesPanel() {
  const [hands, setHands] = useState<Hand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hands")
      .then(r => r.json())
      .then(d => { setHands(d.hands || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const byCategory = hands.reduce<Record<string, Hand[]>>((acc, h) => {
    const cat = h.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-10 animate-fade-in max-w-4xl">
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Capabilities are things your agents can do autonomously. Toggle them on to activate.
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, catHands]) => {
          const active = catHands.filter(h => h.active);
          const inactive = catHands.filter(h => !h.active);
          const accentColor = categoryColor[cat] ?? "var(--color-primary)";

          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  {categoryLabel[cat] || cat}
                </p>
                <span
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--color-border)",
                  }}
                />
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {active.length}/{catHands.length} on
                </span>
              </div>

              {/* Active capability cards */}
              {active.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {active.map(hand => (
                    <CapabilityCard key={hand.id} hand={hand} accentColor={accentColor} />
                  ))}
                </div>
              )}

              {/* Inactive capability cards */}
              {inactive.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inactive.map(hand => (
                    <CapabilityCard key={hand.id} hand={hand} accentColor={accentColor} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function CapabilityCard({ hand, accentColor }: { hand: Hand; accentColor: string }) {
  const [active, setActive] = useState(hand.active);
  const [toggling, setToggling] = useState(false);
  const canActivate = hand.requirements_met && !hand.degraded;
  const displayName = hand.name.replace(" Hand", "");

  // Derive an icon background color from accent
  const iconBg = active
    ? accentColor.replace("var(--color-primary)", "var(--color-primary-dim)")
        .replace("var(--color-secondary)", "var(--color-secondary-dim)")
        .replace("var(--color-accent)", "var(--color-accent-dim)")
        .replace("var(--color-warning)", "rgba(246,217,105,0.15)")
    : "var(--color-surface-2)";

  return (
    <div
      className="card card-hover flex flex-col"
      style={{
        padding: "1.25rem",
        opacity: canActivate ? 1 : 0.65,
        borderTop: active ? `2px solid ${accentColor}` : "1px solid var(--color-border)",
        // Override the top border from .card when active
        borderTopLeftRadius: active ? "0px" : "12px",
        borderTopRightRadius: active ? "0px" : "12px",
        transition: "opacity 0.2s, box-shadow 0.2s, border-color 0.2s",
        boxShadow: active ? `0 0 0 1px ${accentColor}22, 0 4px 24px rgba(0,0,0,0.3)` : undefined,
        borderRadius: "12px",
      }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
        style={{ background: iconBg, fontSize: "24px" }}
      >
        {hand.icon}
      </div>

      {/* Title + description */}
      <p
        className="text-sm font-bold mb-1"
        style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
      >
        {displayName}
      </p>
      <p
        className="text-xs leading-relaxed flex-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        {hand.description}
      </p>

      {/* Status badge + toggle row */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {/* Status badge */}
          {active ? (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: `${accentColor}22`,
                color: accentColor,
                border: `1px solid ${accentColor}44`,
              }}
            >
              Active
            </span>
          ) : !canActivate ? (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(246,217,105,0.1)",
                color: "var(--color-warning)",
                border: "1px solid rgba(246,217,105,0.25)",
              }}
            >
              Missing requirements
            </span>
          ) : (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-subtle)",
                border: "1px solid var(--color-border)",
              }}
            >
              Inactive
            </span>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={async () => {
            if (!canActivate || toggling) return;
            const next = !active;
            setActive(next);
            setToggling(true);
            try {
              await fetch(`/api/openfang/api/hands/${hand.id}/${next ? "enable" : "disable"}`, {
                method: "POST",
              });
            } catch {
              // revert on error
              setActive(!next);
            } finally {
              setToggling(false);
            }
          }}
          disabled={toggling || !canActivate}
          aria-label={active ? "Deactivate" : "Activate"}
          className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
          style={{
            background: active ? accentColor : "var(--color-surface-2)",
            cursor: canActivate && !toggling ? "pointer" : "not-allowed",
            border: active ? "none" : "1px solid var(--color-border-strong)",
            opacity: toggling ? 0.7 : 1,
          }}
        >
          {toggling ? (
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: "white",
                left: active ? "calc(100% - 22px)" : "2px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              <span
                className="w-3 h-3 rounded-full border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: active ? accentColor : "var(--color-text-subtle)",
                  borderRightColor: active ? accentColor : "var(--color-text-subtle)",
                }}
              />
            </span>
          ) : (
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
              style={{
                background: "white",
                left: active ? "calc(100% - 22px)" : "2px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
