/**
 * Audit Logger — Track every agent action.
 *
 * Every agent interaction is logged to SQLite with:
 * - Timestamp, agent ID, session ID
 * - Action type (read, write, execute, api_call)
 * - Target (file path, command, endpoint)
 * - Outcome (success, blocked, error)
 * - Duration, token usage, cost
 *
 * Queryable via API for compliance and debugging.
 */
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

interface AuditEntry {
  ts: number;
  agent_id: string;
  session_id: string;
  action: 'read' | 'write' | 'execute' | 'api_call' | 'file_access' | 'network' | 'auth' | 'blocked';
  target: string;
  outcome: 'success' | 'blocked' | 'error';
  duration_ms: number;
  details: string; // JSON
  ip?: string;
  user_agent?: string;
}

export class AuditLogger {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        outcome TEXT NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        details TEXT NOT NULL DEFAULT '{}',
        ip TEXT,
        user_agent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
      CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_id);
      CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_log(outcome);
    `);
  }

  /**
   * Log an agent action.
   */
  log(entry: Omit<AuditEntry, 'ts'>): void {
    this.db.prepare(`
      INSERT INTO audit_log (ts, agent_id, session_id, action, target, outcome, duration_ms, details, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(),
      entry.agent_id,
      entry.session_id,
      entry.action,
      entry.target,
      entry.outcome,
      entry.duration_ms,
      entry.details,
      entry.ip ?? null,
      entry.user_agent ?? null,
    );
  }

  /**
   * Log a blocked action (security event).
   */
  logBlocked(agentId: string, sessionId: string, action: string, target: string, reason: string): void {
    this.log({
      agent_id: agentId,
      session_id: sessionId,
      action: 'blocked',
      target: `${action}:${target}`,
      outcome: 'blocked',
      duration_ms: 0,
      details: JSON.stringify({ reason }),
    });
  }

  /**
   * Query audit log.
   */
  query(opts: {
    agentId?: string;
    sessionId?: string;
    action?: string;
    outcome?: string;
    since?: number;
    limit?: number;
  }): AuditEntry[] {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (opts.agentId) { sql += ' AND agent_id = ?'; params.push(opts.agentId); }
    if (opts.sessionId) { sql += ' AND session_id = ?'; params.push(opts.sessionId); }
    if (opts.action) { sql += ' AND action = ?'; params.push(opts.action); }
    if (opts.outcome) { sql += ' AND outcome = ?'; params.push(opts.outcome); }
    if (opts.since) { sql += ' AND ts >= ?'; params.push(opts.since); }

    sql += ' ORDER BY ts DESC';
    sql += ` LIMIT ${opts.limit ?? 100}`;

    return this.db.prepare(sql).all(...params) as AuditEntry[];
  }

  /**
   * Get security events (blocked actions).
   */
  getSecurityEvents(since?: number, limit = 50): AuditEntry[] {
    return this.query({ outcome: 'blocked', since, limit });
  }

  /**
   * Get agent activity summary.
   */
  getAgentSummary(agentId: string, since?: number): {
    totalActions: number;
    blockedActions: number;
    actionsByType: Record<string, number>;
    lastActive: number | null;
  } {
    const sinceClause = since ? 'AND ts >= ?' : '';
    const params: any[] = [agentId];
    if (since) params.push(since);

    const total = this.db.prepare(`SELECT COUNT(*) as count FROM audit_log WHERE agent_id = ? ${sinceClause}`).get(...params) as any;
    const blocked = this.db.prepare(`SELECT COUNT(*) as count FROM audit_log WHERE agent_id = ? AND outcome = 'blocked' ${sinceClause}`).get(...params) as any;
    const byType = this.db.prepare(`SELECT action, COUNT(*) as count FROM audit_log WHERE agent_id = ? ${sinceClause} GROUP BY action`).all(...params) as any[];
    const lastActive = this.db.prepare(`SELECT MAX(ts) as last_ts FROM audit_log WHERE agent_id = ?`).get(agentId) as any;

    return {
      totalActions: total.count,
      blockedActions: blocked.count,
      actionsByType: Object.fromEntries(byType.map(r => [r.action, r.count])),
      lastActive: lastActive.last_ts,
    };
  }

  /**
   * Export audit log as CSV.
   */
  exportCsv(since?: number, limit = 1000): string {
    const rows = this.query({ since, limit });
    if (rows.length === 0) return '';

    const headers = ['timestamp', 'agent_id', 'session_id', 'action', 'target', 'outcome', 'duration_ms', 'details'];
    const csvRows = rows.map(r => [
      new Date(r.ts).toISOString(),
      r.agent_id,
      r.session_id,
      r.action,
      r.target,
      r.outcome,
      String(r.duration_ms),
      r.details.replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','));

    return [headers.join(','), ...csvRows].join('\n');
  }

  /**
   * Close the database.
   */
  close(): void {
    this.db.close();
  }
}
