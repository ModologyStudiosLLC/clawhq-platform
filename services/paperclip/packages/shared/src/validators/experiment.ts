import { z } from "zod";
import { EXPERIMENT_EVAL_KINDS } from "../constants.js";

const convergencePolicySchema = z.object({
  maxExperimentsWithoutImprovement: z.number().int().min(1).max(200).default(10),
  targetScore: z.number().nullable().optional().default(null),
  maxBudgetCents: z.number().int().positive().nullable().optional().default(null),
});

export const createExperimentSessionSchema = z.object({
  agentId: z.string().uuid(),
  goal: z.string().min(1).max(2000),
  evalCommand: z.string().min(1).max(4000),
  evalKind: z.enum(EXPERIMENT_EVAL_KINDS).default("shell"),
  scope: z.array(z.string().min(1).max(500)).min(1).max(50),
  convergencePolicy: convergencePolicySchema.default({
    maxExperimentsWithoutImprovement: 10,
    targetScore: null,
    maxBudgetCents: null,
  }),
});
export type CreateExperimentSession = z.infer<typeof createExperimentSessionSchema>;

export const recordExperimentRunSchema = z.object({
  scoreBefore: z.number().nullable().optional(),
  diffPatch: z.string().max(100000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  heartbeatRunId: z.string().uuid().nullable().optional(),
});
export type RecordExperimentRun = z.infer<typeof recordExperimentRunSchema>;
