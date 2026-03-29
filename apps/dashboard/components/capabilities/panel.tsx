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
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Capabilities are things your agents can do autonomously. Toggle them on to activate.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--color-surface)" }} />
          ))}
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, catHands]) => (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>
              {categoryLabel[cat] || cat}
            </p>
            <div className="space-y-2">
              {catHands.map(hand => (
                <CapabilityRow key={hand.id} hand={hand} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CapabilityRow({ hand }: { hand: Hand }) {
  const [active, setActive] = useState(hand.active);
  const canActivate = hand.requirements_met && !hand.degraded;

  return (
    <div
      className="card p-4 flex items-center gap-4"
      style={{ opacity: canActivate ? 1 : 0.6 }}
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{hand.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)", fontFamily: "Manrope, sans-serif" }}>
          {hand.name.replace(" Hand", "")}
        </p>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--color-text-muted)" }}>{hand.description}</p>
        {!canActivate && (
          <p className="text-xs mt-1" style={{ color: "var(--color-warning, #f6d969)" }}>
            Missing requirements
          </p>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => canActivate && setActive(v => !v)}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
        style={{
          background: active ? "var(--color-primary)" : "var(--color-surface-2)",
          cursor: canActivate ? "pointer" : "not-allowed",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
          style={{
            background: "white",
            left: active ? "calc(100% - 22px)" : "2px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}
