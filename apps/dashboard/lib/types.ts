export type AgentStatus = "active" | "idle" | "error" | "offline";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
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
