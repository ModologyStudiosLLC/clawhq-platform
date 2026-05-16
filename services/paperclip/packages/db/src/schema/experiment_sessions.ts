import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const experimentSessions = pgTable(
  "experiment_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    evalCommand: text("eval_command").notNull(),
    evalKind: text("eval_kind").notNull().default("shell"),
    scope: jsonb("scope").$type<string[]>().notNull().default([]),
    convergencePolicy: jsonb("convergence_policy").$type<{
      maxExperimentsWithoutImprovement: number;
      targetScore: number | null;
      maxBudgetCents: number | null;
    }>().notNull(),
    status: text("status").notNull().default("pending"),
    bestScore: real("best_score"),
    currentScore: real("current_score"),
    experimentsRun: integer("experiments_run").notNull().default(0),
    experimentsWithoutImprovement: integer("experiments_without_improvement").notNull().default(0),
    spentCents: integer("spent_cents").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("experiment_sessions_company_status_idx").on(table.companyId, table.status),
    companyAgentIdx: index("experiment_sessions_company_agent_idx").on(table.companyId, table.agentId),
  }),
);

export const experimentRuns = pgTable(
  "experiment_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").notNull().references(() => experimentSessions.id, { onDelete: "cascade" }),
    experimentNumber: integer("experiment_number").notNull(),
    status: text("status").notNull().default("running"),
    scoreBefore: real("score_before"),
    scoreAfter: real("score_after"),
    evalOutput: text("eval_output"),
    diffPatch: text("diff_patch"),
    notes: text("notes"),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionExperimentIdx: index("experiment_runs_session_experiment_idx").on(
      table.companyId,
      table.sessionId,
      table.experimentNumber,
    ),
  }),
);
