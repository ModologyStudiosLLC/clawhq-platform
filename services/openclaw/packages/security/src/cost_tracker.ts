/**
 * ClawHQ Cost Tracking — Per-agent cost tracking with budget enforcement.
 *
 * Integrates ClawCost's cost calculation engine into the ClawHQ platform.
 * Tracks costs per agent, per session, per model with budget enforcement.
 *
 * Works alongside ClawHQ Security — rate limits and cost limits are complementary.
 */
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ── Model Pricing (from ClawCost) ────────────────────────────────────────

interface ModelPricing {
  input: number; output: number; cacheRead: number; cacheWrite: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6':              { input: 15,   output: 75,  cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-sonnet-4-6':            { input: 3,    output: 15,  cacheRead: 0.30,  cacheWrite: 3.75  },
  'claude-3-5-sonnet-20241022':   { input: 3,    output: 15,  cacheRead: 0.30,  cacheWrite: 3.75  },
  'claude-3-5-haiku-20241022':    { input: 0.80, output: 4,   cacheRead: 0.08,  cacheWrite: 1.00  },
  'claude-haiku-4-5':             { input: 0.80, output: 4,   cacheRead: 0.08,  cacheWrite: 1.00  },
  'claude-3-opus-20240229':       { input: 15,   output: 75,  cacheRead: 1.50,  cacheWrite: 18.75 },
  'gpt-4o':                       { input: 2.50, output: 10,  cacheRead: 1.25,  cacheWrite: 0     },
  'gpt-4o-mini':                  { input: 0.15, output: 0.60, cacheRead: 0.075, cacheWrite: 0    },
  'o1':                           { input: 15,   output: 60,  cacheRead: 7.50,  cacheWrite: 0     },
  'o3-mini':                      { input: 1.10, output: 4.40, cacheRead: 0.55,  cacheWrite: 0     },
  'gemini-2.5-pro':               { input: 1.25, output: 10,  cacheRead: 0.31,  cacheWrite: 0     },
  'gemini-2.0-flash':             { input: 0.10, output: 0.40, cacheRead: 0.025, cacheWrite: 0    },
};
const FALLBACK: ModelPricing = { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 };

// ── Budget Config ────────────────────────────────────────────────────────

interface AgentBudget {
  agentId: string;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  warnAtPercent: number; // 0-1, default 0.8
}

// ── Usage Record ─────────────────────────────────────────────────────────

interface CostRecord {
  ts: number;
  agent_id: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
}

// ── Engine ───────────────────────────────────────────────────────────────

export class ClawHQCostTracker {
  private db: BetterSqlite3.Database;
  private budgets: Map<string, AgentBudget> = new Map();
  private defaultBudget: { daily: number; monthly: number };

  constructor(dbPath: string, defaultBudget = { daily: 5.00, monthly: 50.00 }) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.defaultBudget = defaultBudget;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cost_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        cache_write_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_cost_ts ON cost_usage(ts);
      CREATE INDEX IF NOT EXISTS idx_cost_agent ON cost_usage(agent_id);
      CREATE INDEX IF NOT EXISTS idx_cost_session ON cost_usage(session_id);

      CREATE TABLE IF NOT EXISTS agent_budgets (
        agent_id TEXT PRIMARY KEY,
        daily_limit_usd REAL NOT NULL DEFAULT 5.00,
        monthly_limit_usd REAL NOT NULL DEFAULT 50.00,
        warn_at_percent REAL NOT NULL DEFAULT 0.8
      );
    `);

    // Load budgets
    const rows = this.db.prepare('SELECT * FROM agent_budgets').all() as any[];
    for (const r of rows) {
      this.budgets.set(r.agent_id, {
        agentId: r.agent_id,
        dailyLimitUsd: r.daily_limit_usd,
        monthlyLimitUsd: r.monthly_limit_usd,
        warnAtPercent: r.warn_at_percent,
      });
    }
  }

  /**
   * Record a cost event for an agent.
   */
  record(opts: {
    agentId: string;
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  }): { cost: number; blocked: boolean; reason?: string } {
    const cost = this.calcCost(opts.model, opts.inputTokens, opts.outputTokens, opts.cacheReadTokens ?? 0, opts.cacheWriteTokens ?? 0);

    // Check budget BEFORE recording
    const budgetCheck = this.checkBudget(opts.agentId, cost);
    if (budgetCheck.blocked) {
      return { cost, blocked: true, reason: budgetCheck.reason };
    }

    // Record
    this.db.prepare(`
      INSERT INTO cost_usage (ts, agent_id, session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Date.now(), opts.agentId, opts.sessionId, opts.model, opts.inputTokens, opts.outputTokens, opts.cacheReadTokens ?? 0, opts.cacheWriteTokens ?? 0, cost);

    return { cost, blocked: false };
  }

  /**
   * Check if adding cost would exceed budget.
   */
  checkBudget(agentId: string, additionalCost: number): { blocked: boolean; reason?: string; warning?: string } {
    const budget = this.budgets.get(agentId) ?? {
      agentId,
      dailyLimitUsd: this.defaultBudget.daily,
      monthlyLimitUsd: this.defaultBudget.monthly,
      warnAtPercent: 0.8,
    };

    const now = Date.now();
    const dayAgo = now - 86400000;
    const monthAgo = now - 30 * 86400000;

    const dailySpend = this.getSpendSince(agentId, dayAgo) + additionalCost;
    const monthlySpend = this.getSpendSince(agentId, monthAgo) + additionalCost;

    if (dailySpend >= budget.dailyLimitUsd) {
      return { blocked: true, reason: `Daily budget exceeded: $${dailySpend.toFixed(2)} / $${budget.dailyLimitUsd.toFixed(2)}` };
    }
    if (monthlySpend >= budget.monthlyLimitUsd) {
      return { blocked: true, reason: `Monthly budget exceeded: $${monthlySpend.toFixed(2)} / $${budget.monthlyLimitUsd.toFixed(2)}` };
    }

    // Warning at threshold
    if (dailySpend >= budget.dailyLimitUsd * budget.warnAtPercent) {
      return { blocked: false, warning: `Daily budget at ${Math.round(dailySpend / budget.dailyLimitUsd * 100)}% ($${dailySpend.toFixed(2)} / $${budget.dailyLimitUsd.toFixed(2)})` };
    }

    return { blocked: false };
  }

  /**
   * Set budget for an agent.
   */
  setBudget(agentId: string, opts: { daily?: number; monthly?: number; warnAtPercent?: number }): void {
    const existing = this.budgets.get(agentId) ?? {
      agentId,
      dailyLimitUsd: this.defaultBudget.daily,
      monthlyLimitUsd: this.defaultBudget.monthly,
      warnAtPercent: 0.8,
    };

    if (opts.daily !== undefined) existing.dailyLimitUsd = opts.daily;
    if (opts.monthly !== undefined) existing.monthlyLimitUsd = opts.monthly;
    if (opts.warnAtPercent !== undefined) existing.warnAtPercent = opts.warnAtPercent;

    this.budgets.set(agentId, existing);

    this.db.prepare(`
      INSERT OR REPLACE INTO agent_budgets (agent_id, daily_limit_usd, monthly_limit_usd, warn_at_percent)
      VALUES (?, ?, ?, ?)
    `).run(agentId, existing.dailyLimitUsd, existing.monthlyLimitUsd, existing.warnAtPercent);
  }

  /**
   * Get cost stats for an agent.
   */
  getAgentStats(agentId: string): {
    today: { cost: number; requests: number; tokens: number };
    month: { cost: number; requests: number; tokens: number };
    byModel: Array<{ model: string; cost: number; requests: number }>;
    budget: AgentBudget;
  } {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const monthAgo = now - 30 * 86400000;

    const today = this.db.prepare(
      `SELECT SUM(cost_usd) as cost, COUNT(*) as requests, SUM(input_tokens + output_tokens) as tokens FROM cost_usage WHERE agent_id = ? AND ts >= ?`
    ).get(agentId, dayAgo) as any;

    const month = this.db.prepare(
      `SELECT SUM(cost_usd) as cost, COUNT(*) as requests, SUM(input_tokens + output_tokens) as tokens FROM cost_usage WHERE agent_id = ? AND ts >= ?`
    ).get(agentId, monthAgo) as any;

    const byModel = this.db.prepare(
      `SELECT model, SUM(cost_usd) as cost, COUNT(*) as requests FROM cost_usage WHERE agent_id = ? AND ts >= ? GROUP BY model ORDER BY cost DESC`
    ).all(agentId, monthAgo) as any[];

    const budget = this.budgets.get(agentId) ?? {
      agentId,
      dailyLimitUsd: this.defaultBudget.daily,
      monthlyLimitUsd: this.defaultBudget.monthly,
      warnAtPercent: 0.8,
    };

    return {
      today: { cost: today?.cost ?? 0, requests: today?.requests ?? 0, tokens: today?.tokens ?? 0 },
      month: { cost: month?.cost ?? 0, requests: month?.requests ?? 0, tokens: month?.tokens ?? 0 },
      byModel,
      budget,
    };
  }

  /**
   * Get platform-wide cost stats.
   */
  getPlatformStats(): {
    today: { cost: number; requests: number };
    month: { cost: number; requests: number };
    topAgents: Array<{ agentId: string; cost: number; requests: number }>;
    topModels: Array<{ model: string; cost: number; requests: number }>;
  } {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const monthAgo = now - 30 * 86400000;

    const today = this.db.prepare(`SELECT SUM(cost_usd) as cost, COUNT(*) as requests FROM cost_usage WHERE ts >= ?`).get(dayAgo) as any;
    const month = this.db.prepare(`SELECT SUM(cost_usd) as cost, COUNT(*) as requests FROM cost_usage WHERE ts >= ?`).get(monthAgo) as any;
    const topAgents = this.db.prepare(`SELECT agent_id as agentId, SUM(cost_usd) as cost, COUNT(*) as requests FROM cost_usage WHERE ts >= ? GROUP BY agent_id ORDER BY cost DESC LIMIT 10`).all(monthAgo) as any[];
    const topModels = this.db.prepare(`SELECT model, SUM(cost_usd) as cost, COUNT(*) as requests FROM cost_usage WHERE ts >= ? GROUP BY model ORDER BY cost DESC LIMIT 10`).all(monthAgo) as any[];

    return {
      today: { cost: today?.cost ?? 0, requests: today?.requests ?? 0 },
      month: { cost: month?.cost ?? 0, requests: month?.requests ?? 0 },
      topAgents,
      topModels,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private calcCost(model: string, inputTokens: number, outputTokens: number, cacheRead: number, cacheWrite: number): number {
    const p = PRICING[model] ?? FALLBACK;
    return (inputTokens * p.input + outputTokens * p.output + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite) / 1_000_000;
  }

  private getSpendSince(agentId: string, sinceTs: number): number {
    const row = this.db.prepare(`SELECT SUM(cost_usd) as total FROM cost_usage WHERE agent_id = ? AND ts >= ?`).get(agentId, sinceTs) as any;
    return row?.total ?? 0;
  }

  close(): void {
    this.db.close();
  }
}
