/**
 * Scoped API Keys — Each agent gets its own limited credentials.
 *
 * Instead of sharing global API keys across all agents:
 * - Each agent gets a scoped key with specific permissions
 * - Keys can be revoked independently
 * - Usage tracked per key
 * - Keys expire automatically
 */
import crypto from 'crypto';

export interface ApiKeyScope {
  agentId: string;
  permissions: ('read' | 'write' | 'execute' | 'api_call')[];
  allowedDomains?: string[];   // Outbound domains this key can access
  maxTokensPerDay?: number;
  maxCostPerDay?: number;
  expiresAt?: number;          // Unix timestamp
}

interface ApiKey {
  key: string;
  prefix: string;
  scope: ApiKeyScope;
  createdAt: number;
  lastUsedAt: number | null;
  usageCount: number;
  revoked: boolean;
}

export class ScopedApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private prefixMap: Map<string, string> = new Map(); // prefix -> full key

  /**
   * Generate a new scoped API key.
   */
  createKey(scope: ApiKeyScope): { key: string; prefix: string } {
    const raw = crypto.randomBytes(32).toString('hex');
    const prefix = `cc_${scope.agentId.slice(0, 8)}_`;
    const key = prefix + raw;

    this.keys.set(key, {
      key,
      prefix,
      scope,
      createdAt: Date.now(),
      lastUsedAt: null,
      usageCount: 0,
      revoked: false,
    });

    this.prefixMap.set(prefix, key);

    return { key, prefix };
  }

  /**
   * Validate a key and check permissions.
   */
  validate(key: string, requiredPermission: string, target?: string): {
    valid: boolean;
    reason?: string;
    scope?: ApiKeyScope;
  } {
    const apiKey = this.keys.get(key);

    if (!apiKey) {
      return { valid: false, reason: 'Key not found' };
    }

    if (apiKey.revoked) {
      return { valid: false, reason: 'Key has been revoked' };
    }

    if (apiKey.scope.expiresAt && Date.now() > apiKey.scope.expiresAt) {
      return { valid: false, reason: 'Key has expired' };
    }

    if (!apiKey.scope.permissions.includes(requiredPermission as any)) {
      return { valid: false, reason: `Permission "${requiredPermission}" not granted to this key` };
    }

    // Check domain restriction
    if (target && apiKey.scope.allowedDomains && apiKey.scope.allowedDomains.length > 0) {
      try {
        const url = new URL(target);
        const allowed = apiKey.scope.allowedDomains.some(d =>
          url.hostname === d || url.hostname.endsWith('.' + d)
        );
        if (!allowed) {
          return { valid: false, reason: `Domain "${url.hostname}" not in allowed list` };
        }
      } catch {
        // Not a URL, skip domain check
      }
    }

    // Update usage
    apiKey.lastUsedAt = Date.now();
    apiKey.usageCount++;

    return { valid: true, scope: apiKey.scope };
  }

  /**
   * Revoke a key.
   */
  revoke(key: string): boolean {
    const apiKey = this.keys.get(key);
    if (!apiKey) return false;
    apiKey.revoked = true;
    return true;
  }

  /**
   * Revoke all keys for an agent.
   */
  revokeAgent(agentId: string): number {
    let count = 0;
    for (const [, apiKey] of this.keys) {
      if (apiKey.scope.agentId === agentId && !apiKey.revoked) {
        apiKey.revoked = true;
        count++;
      }
    }
    return count;
  }

  /**
   * List keys for an agent (without exposing the full key).
   */
  listKeys(agentId: string): Array<{ prefix: string; permissions: string[]; createdAt: number; usageCount: number; revoked: boolean }> {
    const result = [];
    for (const [, apiKey] of this.keys) {
      if (apiKey.scope.agentId === agentId) {
        result.push({
          prefix: apiKey.prefix,
          permissions: apiKey.scope.permissions,
          createdAt: apiKey.createdAt,
          usageCount: apiKey.usageCount,
          revoked: apiKey.revoked,
        });
      }
    }
    return result;
  }

  /**
   * Get total keys created.
   */
  getStats(): { total: number; active: number; revoked: number } {
    let active = 0;
    let revoked = 0;
    for (const [, apiKey] of this.keys) {
      if (apiKey.revoked) revoked++;
      else active++;
    }
    return { total: this.keys.size, active, revoked };
  }
}
