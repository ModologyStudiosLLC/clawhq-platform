import { MetricCards } from "@/components/dashboard/metric-cards";
import { AgentStatusGrid } from "@/components/dashboard/agent-status-grid";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { SystemAlerts } from "@/components/dashboard/system-alerts";
import { CostIntelligence } from "@/components/dashboard/cost-intelligence";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <MetricCards />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}>Agent Fleet</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Live status of all agents</p>
              </div>
            </div>
            <AgentStatusGrid />
          </section>

          <section className="card p-6">
            <CostIntelligence />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <SystemAlerts />
          </section>
          <section className="card p-6">
            <ActivityTimeline />
          </section>
          <section className="card p-6">
            <QuickActions />
          </section>
        </div>
      </div>
    </div>
  );
}
