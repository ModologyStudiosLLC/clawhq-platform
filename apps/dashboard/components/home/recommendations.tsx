"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Recommendation } from "@/app/api/recommendations/route";

const CATEGORY_COLORS: Record<Recommendation["category"], { bg: string; text: string }> = {
  integration: { bg: "var(--color-primary-dim)", text: "var(--color-primary)" },
  kit:         { bg: "var(--color-accent-dim)",   text: "var(--color-accent)" },
  capability:  { bg: "var(--color-secondary-dim)", text: "var(--color-secondary)" },
  agent:       { bg: "var(--color-primary-dim)",  text: "var(--color-primary)" },
  workflow:    { bg: "var(--color-accent-dim)",    text: "var(--color-accent)" },
};

const CATEGORY_LABELS: Record<Recommendation["category"], string> = {
  integration: "Integration",
  kit:         "Kit",
  capability:  "Capability",
  agent:       "Agent",
  workflow:    "Workflow",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const colors = CATEGORY_COLORS[rec.category] ?? CATEGORY_COLORS.agent;

  return (
    <Link
      href={rec.href}
      className="card card-hover flex flex-col gap-3"
      style={{ padding: "1.25rem", minHeight: "9rem" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: colors.bg }}
        >
          {rec.icon}
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: colors.bg, color: colors.text }}
        >
          {CATEGORY_LABELS[rec.category]}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1">
        {rec.priority === "high" && (
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: colors.text, fontFamily: "var(--font-mono)" }}
          >
            Recommended
          </div>
        )}
        <p
          className="text-sm font-bold leading-snug"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          {rec.title}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {rec.description}
        </p>
      </div>

      {/* CTA */}
      <div
        className="flex items-center gap-1 text-xs font-semibold mt-auto"
        style={{ color: colors.text }}
      >
        {rec.cta}
        <ArrowRight size={11} />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div
      className="card flex flex-col gap-3 animate-pulse"
      style={{ padding: "1.25rem", minHeight: "9rem" }}
    >
      <div className="flex items-start gap-2">
        <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "var(--color-surface-2)" }} />
        <div className="h-5 w-20 rounded-full mt-0.5" style={{ background: "var(--color-surface-2)" }} />
      </div>
      <div className="space-y-2 flex-1">
        <div className="h-4 rounded w-4/5" style={{ background: "var(--color-surface-2)" }} />
        <div className="h-3 rounded w-full" style={{ background: "var(--color-surface-2)" }} />
        <div className="h-3 rounded w-3/5" style={{ background: "var(--color-surface-2)" }} />
      </div>
    </div>
  );
}

export function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (bust = false) => {
    try {
      const res = await fetch(`/api/recommendations${bust ? "?bust=1" : ""}`);
      if (!res.ok) return;
      const { recommendations } = await res.json() as { recommendations: Recommendation[] };
      setRecs(recommendations ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function refresh() {
    setRefreshing(true);
    load(true);
  }

  if (!loading && recs.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles
            size={14}
            style={{ color: "var(--color-primary)" }}
          />
          <h2
            className="font-bold text-sm"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            Recommended for you
          </h2>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-opacity"
          style={{
            color: "var(--color-text-muted)",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : recs.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
        }
      </div>
    </div>
  );
}
