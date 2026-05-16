import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createExperimentSessionSchema, recordExperimentRunSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { experimentSessionService, logActivity } from "../services/index.js";
import { publishLiveEvent } from "../services/live-events.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { forbidden, notFound, unauthorized } from "../errors.js";

export function experimentSessionRoutes(db: Db) {
  const router = Router();
  const svc = experimentSessionService(db);

  router.post(
    "/companies/:companyId/experiment-sessions",
    validate(createExperimentSessionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      // Agents can only create sessions for themselves
      if (req.actor.type === "agent" && req.actor.agentId !== req.body.agentId) {
        res.status(403).json({ error: "Agents can only create sessions for themselves" });
        return;
      }

      const actor = getActorInfo(req);
      const session = await svc.create(companyId, req.body, {
        agentId: actor.agentId,
        userId: actor.actorType === "user" ? actor.actorId : null,
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "experiment_session.created",
        entityType: "experiment_session",
        entityId: session.id,
        details: { goal: session.goal, evalKind: session.evalKind },
      });

      publishLiveEvent({
        companyId,
        type: "experiment.session_updated",
        payload: { sessionId: session.id, status: session.status },
      });

      res.status(201).json(session);
    },
  );

  router.get("/companies/:companyId/experiment-sessions", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const sessions = await svc.list(companyId);
    res.json(sessions);
  });

  router.get("/experiment-sessions/:id", async (req, res) => {
    const sessionId = req.params.id as string;
    const session = await svc.get(sessionId);
    if (!session) {
      throw notFound("Experiment session not found");
    }
    assertCompanyAccess(req, session.companyId);
    res.json(session);
  });

  router.delete("/experiment-sessions/:id", async (req, res) => {
    const sessionId = req.params.id as string;
    const existing = await svc.get(sessionId);
    if (!existing) {
      throw notFound("Experiment session not found");
    }
    assertCompanyAccess(req, existing.companyId);

    // Only board or the owning agent can stop a session
    if (req.actor.type === "agent") {
      if (!req.actor.agentId) throw unauthorized();
      if (existing.agentId !== req.actor.agentId) {
        throw forbidden("Agents can only stop their own sessions");
      }
    }

    const stopped = await svc.stop(sessionId);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "experiment_session.stopped",
      entityType: "experiment_session",
      entityId: sessionId,
      details: {},
    });

    publishLiveEvent({
      companyId: existing.companyId,
      type: "experiment.session_updated",
      payload: { sessionId, status: "stopped" },
    });

    res.json(stopped);
  });

  // Agent-facing: post an experiment run result, get back keep/converge decision
  router.post(
    "/experiment-sessions/:id/runs",
    validate(recordExperimentRunSchema),
    async (req, res) => {
      const sessionId = req.params.id as string;
      const existing = await svc.get(sessionId);
      if (!existing) {
        throw notFound("Experiment session not found");
      }
      assertCompanyAccess(req, existing.companyId);

      // Only the owning agent or board can post runs
      if (req.actor.type === "agent") {
        if (!req.actor.agentId) throw unauthorized();
        if (existing.agentId !== req.actor.agentId) {
          throw forbidden("Only the owning agent can post experiment runs");
        }
      }

      const result = await svc.recordRun(sessionId, req.body);

      publishLiveEvent({
        companyId: existing.companyId,
        type: "experiment.session_updated",
        payload: {
          sessionId,
          status: result.converged ? "converged" : "running",
          experimentsRun: existing.experimentsRun + 1,
          scoreAfter: result.scoreAfter,
          keepChange: result.keepChange,
        },
      });

      if (result.converged) {
        const actor = getActorInfo(req);
        await logActivity(db, {
          companyId: existing.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "experiment_session.converged",
          entityType: "experiment_session",
          entityId: sessionId,
          details: { bestScore: existing.bestScore },
        });
      }

      res.json(result);
    },
  );

  return router;
}
