// Reusable skeleton loading components
// Use animate-pulse with var(--color-surface-2) background

// ── SkeletonText ──────────────────────────────────────────────────────────────

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-md animate-pulse"
          style={{
            background: "var(--color-surface-2)",
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  lines?: number;
  height?: string;
}

export function SkeletonCard({ lines = 3, height }: SkeletonCardProps) {
  if (height) {
    return (
      <div
        className="rounded-xl animate-pulse"
        style={{ background: "var(--color-surface-2)", height }}
      />
    );
  }

  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Icon placeholder */}
      <div
        className="w-10 h-10 rounded-xl animate-pulse"
        style={{ background: "var(--color-surface-2)" }}
      />
      {/* Text lines */}
      <div className="space-y-2 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-md animate-pulse"
            style={{
              background: "var(--color-surface-2)",
              width: i === 0 ? "50%" : i === lines - 1 ? "70%" : "85%",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── SkeletonGrid ──────────────────────────────────────────────────────────────

interface SkeletonGridProps {
  cols?: number;
  count?: number;
}

export function SkeletonGrid({ cols = 3, count = 6 }: SkeletonGridProps) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : cols === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : cols === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid ${colClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ── SkeletonTable ─────────────────────────────────────────────────────────────

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div
        className="grid gap-4 px-4 py-2 rounded-lg"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-md animate-pulse"
            style={{ background: "var(--color-surface-2)", width: "60%" }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 px-4 py-3 rounded-xl"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 rounded-md animate-pulse"
              style={{
                background: "var(--color-surface-2)",
                width: c === 0 ? "80%" : "60%",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
