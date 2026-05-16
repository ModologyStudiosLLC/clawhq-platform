import type { ExperimentSessionStatus, ExperimentEvalKind } from "../constants.js";

export interface ExperimentConvergencePolicy {
  maxExperimentsWithoutImprovement: number;
  targetScore: number | null;
  maxBudgetCents: number | null;
}

export interface ExperimentSession {
  id: string;
  companyId: string;
  agentId: string;
  goal: string;
  evalCommand: string;
  evalKind: ExperimentEvalKind;
  scope: string[];
  convergencePolicy: ExperimentConvergencePolicy;
  status: ExperimentSessionStatus;
  bestScore: number | null;
  currentScore: number | null;
  experimentsRun: number;
  experimentsWithoutImprovement: number;
  spentCents: number;
  startedAt: string | null;
  completedAt: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentRun {
  id: string;
  companyId: string;
  sessionId: string;
  experimentNumber: number;
  status: "running" | "kept" | "discarded" | "error";
  scoreBefore: number | null;
  scoreAfter: number | null;
  evalOutput: string | null;
  diffPatch: string | null;
  notes: string | null;
  heartbeatRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentSessionDetail extends ExperimentSession {
  recentRuns: ExperimentRun[];
}

export interface ExperimentSessionListItem {
  id: string;
  agentId: string;
  goal: string;
  status: ExperimentSessionStatus;
  bestScore: number | null;
  experimentsRun: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RecordExperimentRunResult {
  scoreAfter: number;
  keepChange: boolean;
  converged: boolean;
}
