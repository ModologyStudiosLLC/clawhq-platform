import { eq, desc, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { experimentSessions, experimentRuns } from "@paperclipai/db";
import type {
  ExperimentSession,
  ExperimentSessionDetail,
  ExperimentSessionListItem,
  ExperimentRun,
  RecordExperimentRunResult,
  CreateExperimentSession,
  RecordExperimentRun,
} from "@paperclipai/shared";
import { runEval } from "./experiment-eval-runner.js";

function toSession(row: typeof experimentSessions.$inferSelect): ExperimentSession {
  return {
    id: row.id,
    companyId: row.companyId,
    agentId: row.agentId,
    goal: row.goal,
    evalCommand: row.evalCommand,
    evalKind: row.evalKind as ExperimentSession["evalKind"],
    scope: (row.scope as string[]) ?? [],
    convergencePolicy: row.convergencePolicy as ExperimentSession["convergencePolicy"],
    status: row.status as ExperimentSession["status"],
    bestScore: row.bestScore ?? null,
    currentScore: row.currentScore ?? null,
    experimentsRun: row.experimentsRun,
    experimentsWithoutImprovement: row.experimentsWithoutImprovement,
    spentCents: row.spentCents,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdByAgentId: row.createdByAgentId ?? null,
    createdByUserId: row.createdByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRun(row: typeof experimentRuns.$inferSelect): ExperimentRun {
  return {
    id: row.id,
    companyId: row.companyId,
    sessionId: row.sessionId,
    experimentNumber: row.experimentNumber,
    status: row.status as ExperimentRun["status"],
    scoreBefore: row.scoreBefore ?? null,
    scoreAfter: row.scoreAfter ?? null,
    evalOutput: row.evalOutput ?? null,
    diffPatch: row.diffPatch ?? null,
    notes: row.notes ?? null,
    heartbeatRunId: row.heartbeatRunId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function experimentSessionService(db: Db) {
  async function create(
    companyId: string,
    body: CreateExperimentSession,
    actor: { agentId?: string | null; userId?: string | null },
  ): Promise<ExperimentSession> {
    const [row] = await db
      .insert(experimentSessions)
      .values({
        companyId,
        agentId: body.agentId,
        goal: body.goal,
        evalCommand: body.evalCommand,
        evalKind: body.evalKind,
        scope: body.scope,
        convergencePolicy: body.convergencePolicy,
        status: "running",
        startedAt: new Date(),
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.userId ?? null,
      })
      .returning();
    return toSession(row);
  }

  async function get(sessionId: string): Promise<ExperimentSessionDetail | null> {
    const [row] = await db
      .select()
      .from(experimentSessions)
      .where(eq(experimentSessions.id, sessionId))
      .limit(1);
    if (!row) return null;

    const runs = await db
      .select()
      .from(experimentRuns)
      .where(eq(experimentRuns.sessionId, sessionId))
      .orderBy(desc(experimentRuns.experimentNumber))
      .limit(50);

    return { ...toSession(row), recentRuns: runs.map(toRun) };
  }

  async function list(companyId: string): Promise<ExperimentSessionListItem[]> {
    const rows = await db
      .select()
      .from(experimentSessions)
      .where(eq(experimentSessions.companyId, companyId))
      .orderBy(desc(experimentSessions.createdAt))
      .limit(100);

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      goal: r.goal,
      status: r.status as ExperimentSession["status"],
      bestScore: r.bestScore ?? null,
      experimentsRun: r.experimentsRun,
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async function stop(sessionId: string): Promise<ExperimentSession | null> {
    const [updated] = await db
      .update(experimentSessions)
      .set({ status: "stopped", completedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(experimentSessions.id, sessionId),
          // only stop sessions that are still active
        ),
      )
      .returning();
    return updated ? toSession(updated) : null;
  }

  async function recordRun(
    sessionId: string,
    body: RecordExperimentRun,
  ): Promise<RecordExperimentRunResult> {
    // Load session
    const [sessionRow] = await db
      .select()
      .from(experimentSessions)
      .where(eq(experimentSessions.id, sessionId))
      .limit(1);
    if (!sessionRow) throw new Error("Session not found");

    const session = toSession(sessionRow);
    const policy = session.convergencePolicy;

    // Run the eval
    let evalScore = 0;
    let evalOutput = "";
    let evalError: string | null = null;
    try {
      const result = await runEval(session.evalKind, session.evalCommand);
      evalScore = result.score;
      evalOutput = result.raw;
    } catch (err) {
      evalError = String(err);
      evalOutput = evalError;
    }

    const scoreBefore = body.scoreBefore ?? session.currentScore ?? null;
    const scoreAfter = evalError ? null : evalScore;

    // Decide whether to keep the change
    const keepChange =
      !evalError &&
      scoreAfter !== null &&
      (scoreBefore === null || scoreAfter > scoreBefore);

    const newExperimentsRun = session.experimentsRun + 1;
    const newWithoutImprovement = keepChange ? 0 : session.experimentsWithoutImprovement + 1;
    const newBestScore =
      keepChange && (session.bestScore === null || scoreAfter! > session.bestScore)
        ? scoreAfter!
        : session.bestScore;
    const newCurrentScore = keepChange ? scoreAfter! : session.currentScore;

    // Check convergence
    const hitMaxWithoutImprovement =
      newWithoutImprovement >= policy.maxExperimentsWithoutImprovement;
    const hitTargetScore =
      policy.targetScore !== null && newBestScore !== null && newBestScore >= policy.targetScore;
    const converged = hitMaxWithoutImprovement || hitTargetScore;

    // Insert run record
    await db.insert(experimentRuns).values({
      companyId: session.companyId,
      sessionId,
      experimentNumber: newExperimentsRun,
      status: evalError ? "error" : keepChange ? "kept" : "discarded",
      scoreBefore: scoreBefore ?? undefined,
      scoreAfter: scoreAfter ?? undefined,
      evalOutput,
      diffPatch: body.diffPatch ?? null,
      notes: body.notes ?? null,
      heartbeatRunId: body.heartbeatRunId ?? null,
    });

    // Update session counters
    await db
      .update(experimentSessions)
      .set({
        experimentsRun: newExperimentsRun,
        experimentsWithoutImprovement: newWithoutImprovement,
        bestScore: newBestScore ?? undefined,
        currentScore: newCurrentScore ?? undefined,
        status: converged ? "converged" : evalError && newExperimentsRun === 1 ? "error" : "running",
        completedAt: converged ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(experimentSessions.id, sessionId));

    return {
      scoreAfter: scoreAfter ?? 0,
      keepChange,
      converged,
    };
  }

  return { create, get, list, stop, recordRun };
}
