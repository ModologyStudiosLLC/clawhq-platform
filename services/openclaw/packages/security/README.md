# ClawHQ Security — Security + Cost Tracking for Self-Hosted AI Agents

Five modules that protect and track costs for your self-hosted AI agent platform.

## Modules

### 1. Agent Sandbox (`sandbox.ts`)
Restricts agents to their workspace. Prevents:
- Filesystem traversal (`../../etc/passwd`)
- Access to sensitive files (.env, .ssh, credentials)
- Dangerous commands (rm -rf, curl | sh, reverse shells)
- Oversized file access (>10MB default)

### 2. Audit Logger (`audit.ts`)
Every agent action logged to SQLite:
- Timestamp, agent ID, session ID
- Action type (read, write, execute, api_call, blocked)
- Target (file path, command, endpoint)
- Outcome (success, blocked, error)
- Duration, token usage, cost
- Queryable via API for compliance

### 3. Rate Limiter (`rate_limiter.ts`)
Per-agent rate limits:
- 30 requests/minute (default)
- 500 requests/hour
- 500K tokens/hour
- 2M tokens/day
- $2/hour, $10/day cost limits

Configurable per agent. Token bucket algorithm.

### 4. Scoped API Keys (`api_keys.ts`)
Each agent gets its own credentials:
- Scoped permissions (read, write, execute, api_call)
- Domain restrictions (which external APIs the agent can call)
- Automatic expiration
- Revocable independently
- Usage tracking

### 5. Cost Tracker (`cost_tracker.ts`) — from ClawCost
Per-agent cost tracking with budget enforcement:
- 12 model pricing (Claude 4.x, 3.x, GPT-4o, o1, Gemini)
- Per-agent daily/monthly budgets
- Budget blocking (HTTP 429 when exceeded)
- Warning at 80% threshold
- Platform-wide cost dashboard data
- Per-agent cost attribution

## Usage

```typescript
import { ClawHQSecurity } from './index.js';

const security = new ClawHQSecurity({
  workspaceRoot: '/home/user/agents',
  auditDbPath: '~/.clawhq/audit.db',
  rateLimits: { maxRequestsPerMinute: 30 },
});

// Before any agent action:
try {
  security.validateAction(agentId, sessionId, 'read', '/path/to/file');
} catch (err) {
  // Action blocked — logged to audit
}

// After action completes:
security.recordAction(agentId, sessionId, 'read', '/path/to/file', 'success', 150, { tokens: 500 });

// Get security dashboard:
const dashboard = security.getDashboard();
```

## Integration with OpenClaw

Add to your OpenClaw gateway config:
```json
{
  "security": {
    "enabled": true,
    "workspaceRoot": "/Users/mflanigan/.openclaw/workspace",
    "auditDbPath": "~/.clawhq/audit.db",
    "rateLimits": {
      "maxRequestsPerMinute": 30,
      "maxCostPerDay": 10.00
    }
  }
}
```

## Roadmap

### Tier 2 (this week)
- Network policy (whitelist outbound domains per agent)
- Secret isolation (per-agent secret access)
- Session isolation (per-session temp directories)
- Kill switch (one-click terminate all agents)

### Tier 3 (later)
- NVIDIA OpenShell integration
- Policy DSL (YAML-based agent policies)
- SOC2-style audit trail
- Data loss prevention
