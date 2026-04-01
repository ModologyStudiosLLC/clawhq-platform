/**
 * ClawHQ Security — Unified security layer for self-hosted AI agent platform.
 *
 * Tier 1 Security Features:
 * 1. Agent Sandboxing — filesystem + command restrictions
 * 2. Audit Logging — every action tracked to SQLite
 * 3. Rate Limiting — per-agent token/cost/request limits
 * 4. Scoped API Keys — per-agent credentials with limited permissions
 *
 * Usage:
 *   import { ClawHQSecurity } from './index.js';
 *
 *   const security = new ClawHQSecurity({
 *     workspaceRoot: '/home/user/agents',
 *     auditDbPath: '~/.clawhq/audit.db',
 *     rateLimits: { maxRequestsPerMinute: 30 },
 *   });
 *
 *   // Before any agent action:
 *   security.validateAction(agentId, sessionId, 'read', '/path/to/file');
 *
 *   // After action completes:
 *   security.recordAction(agentId, sessionId, 'read', '/path/to/file', 'success', 150, { tokens: 500 });
 */

import { AgentSandbox, SandboxError, type SandboxConfig } from './sandbox.js';
import { AuditLogger } from './audit.js';
import { RateLimiter } from './rate_limiter.js';
import { ScopedApiKeyManager, type ApiKeyScope } from './api_keys.js';
import { ClawHQCostTracker } from './cost_tracker.js';

export interface SecurityConfig {
  workspaceRoot: string;
  auditDbPath: string;
  costDbPath?: string; // If set, enables cost tracking (from ClawCost)
  rateLimits?: {
    maxRequestsPerMinute?: number;
    maxRequestsPerHour?: number;
    maxTokensPerHour?: number;
    maxTokensPerDay?: number;
    maxCostPerHour?: number;
    maxCostPerDay?: number;
  };
  sandbox?: {
    blockedPaths?: string[];
    maxFileSize?: number;
    readOnly?: boolean;
  };
  budget?: {
    daily?: number;
    monthly?: number;
  };
}

export class ClawHQSecurity {
  public sandbox: AgentSandbox;
  public audit: AuditLogger;
  public rateLimiter: RateLimiter;
  public apiKeys: ScopedApiKeyManager;
  public costs: ClawHQCostTracker | null;

  constructor(config: SecurityConfig) {
    this.sandbox = new AgentSandbox({
      workspaceRoot: config.workspaceRoot,
      ...config.sandbox,
    });

    this.audit = new AuditLogger(config.auditDbPath);
    this.rateLimiter = new RateLimiter(config.rateLimits);
    this.apiKeys = new ScopedApiKeyManager();

    // Cost tracking (from ClawCost integration)
    if (config.costDbPath) {
      this.costs = new ClawHQCostTracker(config.costDbPath, {
        daily: config.budget?.daily ?? 5.00,
        monthly: config.budget?.monthly ?? 50.00,
      });
    } else {
      this.costs = null;
    }
  }

  /**
   * Validate an agent action before execution.
   * Throws SandboxError if blocked.
   * Throws RateLimitError if rate limited.
   */
  validateAction(
    agentId: string,
    sessionId: string,
    action: 'read' | 'write' | 'execute' | 'api_call',
    target: string,
  ): void {
    // 1. Check rate limits
    const rateCheck = this.rateLimiter.check(agentId);
    if (!rateCheck.allowed) {
      this.audit.logBlocked(agentId, sessionId, action, target, rateCheck.reason!);
      throw new RateLimitError(rateCheck.reason!, rateCheck.retryAfterMs!);
    }

    // 2. Validate sandbox (for file operations)
    if (action === 'read' || action === 'write') {
      try {
        this.sandbox.validatePath(target);
      } catch (err) {
        if (err instanceof SandboxError) {
          this.audit.logBlocked(agentId, sessionId, action, target, err.message);
          throw err;
        }
        throw err;
      }
    }

    // 3. Validate commands
    if (action === 'execute') {
      try {
        this.sandbox.validateCommand(target);
      } catch (err) {
        if (err instanceof SandboxError) {
          this.audit.logBlocked(agentId, sessionId, action, target, err.message);
          throw err;
        }
        throw err;
      }
    }
  }

  /**
   * Record a completed action.
   */
  recordAction(
    agentId: string,
    sessionId: string,
    action: 'read' | 'write' | 'execute' | 'api_call',
    target: string,
    outcome: 'success' | 'blocked' | 'error',
    durationMs: number,
    opts: { tokens?: number; cost?: number; details?: Record<string, any> } = {},
  ): void {
    this.audit.log({
      agent_id: agentId,
      session_id: sessionId,
      action,
      target,
      outcome,
      duration_ms: durationMs,
      details: JSON.stringify(opts.details ?? {}),
    });

    this.rateLimiter.consume(agentId, { tokens: opts.tokens, cost: opts.cost });
  }

  /**
   * Create a scoped API key for an agent.
   */
  createAgentKey(agentId: string, permissions: string[], opts: {
    allowedDomains?: string[];
    expiresInSeconds?: number;
  } = {}): { key: string; prefix: string } {
    return this.apiKeys.createKey({
      agentId,
      permissions: permissions as any[],
      allowedDomains: opts.allowedDomains,
      expiresAt: opts.expiresInSeconds ? Date.now() + opts.expiresInSeconds * 1000 : undefined,
    });
  }

  /**
   * Get security dashboard data.
   */
  getDashboard(sinceMs?: number): {
    recentBlocked: any[];
    agentSummaries: Record<string, any>;
    rateLimits: Record<string, any>;
    apiKeys: { total: number; active: number; revoked: number };
  } {
    const since = sinceMs ?? Date.now() - 86400000; // Last 24 hours
    const blocked = this.audit.getSecurityEvents(since, 20);

    // Get summaries for recent agents
    const agentIds = [...new Set(blocked.map(e => e.agent_id))];
    const agentSummaries: Record<string, any> = {};
    for (const id of agentIds) {
      agentSummaries[id] = this.audit.getAgentSummary(id, since);
    }

    return {
      recentBlocked: blocked,
      agentSummaries,
      rateLimits: {}, // Filled per-agent on request
      apiKeys: this.apiKeys.getStats(),
    };
  }

  /**
   * Record a cost event for an agent (from ClawCost).
   */
  recordCost(opts: {
    agentId: string;
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  }): { cost: number; blocked: boolean; reason?: string; warning?: string } {
    if (!this.costs) return { cost: 0, blocked: false };

    const result = this.costs.record(opts);

    // Log to audit
    this.audit.log({
      agent_id: opts.agentId,
      session_id: opts.sessionId,
      action: 'api_call',
      target: opts.model,
      outcome: result.blocked ? 'blocked' : 'success',
      duration_ms: 0,
      details: JSON.stringify({ cost: result.cost, tokens: opts.inputTokens + opts.outputTokens }),
    });

    return result;
  }

  /**
   * Get cost stats for an agent.
   */
  getAgentCosts(agentId: string): any {
    if (!this.costs) return null;
    return this.costs.getAgentStats(agentId);
  }

  /**
   * Get platform-wide cost stats.
   */
  getPlatformCosts(): any {
    if (!this.costs) return null;
    return this.costs.getPlatformStats();
  }

  /**
   * Close all resources.
   */
  close(): void {
    this.audit.close();
    this.costs?.close();
  }
}

// ── Re-exports ─────────────────────────────────────────────────────────

export { AgentSandbox, SandboxError } from './sandbox.js';
export { AuditLogger } from './audit.js';
export { RateLimiter } from './rate_limiter.js';
export { ScopedApiKeyManager } from './api_keys.js';
export { ClawHQCostTracker } from './cost_tracker.js';
export { selectRoleForTask, listRoles, getRolesByTier, ROLES } from './specialists.js';
export { SecurityAuditor } from './security_audit.js';

export class RateLimitError extends Error {
  constructor(message: string, public retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}
