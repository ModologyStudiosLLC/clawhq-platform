import { AnalyticsView } from "@/components/analytics/view";

export default function AnalyticsPage() {
  return (
    <div className="max-w-3xl space-y-1">
      <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
        Usage Analytics
      </h1>
      <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
        Token spend and cost estimates per agent over time.
      </p>
      <AnalyticsView />
    </div>
  );
}
