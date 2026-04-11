export type AgentStatus = "active" | "idle" | "error" | "offline";

/** Team role in a multi-agent setup. Controls permissions and dashboard grouping. */
export type AgentRole = "worker" | "observer" | "operator";

export const AGENT_ROLE_META: Record<AgentRole, { label: string; description: string; color: string; dim: string }> = {
  worker:   { label: "Worker",   description: "Executes tasks. Writes to its own worktree only.", color: "var(--color-primary)",   dim: "var(--color-primary-dim)" },
  observer: { label: "Observer", description: "Read-only. Synthesizes team state, detects conflicts.", color: "var(--color-secondary)", dim: "var(--color-secondary-dim)" },
  operator: { label: "Operator", description: "Elevated permissions. Merges, deploys, restarts workers.", color: "var(--color-warning)",   dim: "color-mix(in srgb, var(--color-warning) 15%, transparent)" },
};

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  agentRole?: AgentRole;
  status: AgentStatus;
  model: string;
  lastSeen: string;
  tasksCompleted: number;
  costToday: number;
}

export interface Task {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  status: "running" | "completed" | "failed" | "queued";
  createdAt: string;
  completedAt?: string;
}

export interface CostEntry {
  date: string;
  total: number;
  byAgent: Record<string, number>;
}

export interface ActivityEvent {
  id: string;
  type: "message" | "task_start" | "task_complete" | "task_fail" | "agent_online" | "agent_offline";
  agentId: string;
  agentName: string;
  description: string;
  timestamp: string;
}

export interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface MetricSummary {
  activeAgents: number;
  totalAgents: number;
  tasksToday: number;
  costToday: number;
  costMonth: number;
  successRate: number;
}
