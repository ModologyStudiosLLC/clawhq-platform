/**
 * Rate Limiter — Per-agent rate limiting.
 *
 * Prevents runaway agents from:
 * - Burning too many tokens per hour/day
 * - Making too many API calls per minute
 * - Consuming too much compute per session
 * - Creating too many sessions
 *
 * Token bucket algorithm with configurable limits per agent.
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  maxSessionsPerAgent: number;
  maxCostPerHour: number;    // USD
  maxCostPerDay: number;     // USD
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 30,
  maxRequestsPerHour: 500,
  maxTokensPerHour: 500000,
  maxTokensPerDay: 2000000,
  maxSessionsPerAgent: 10,
  maxCostPerHour: 2.00,
  maxCostPerDay: 10.00,
};

export class RateLimiter {
  private configs: Map<string, RateLimitConfig> = new Map();
  private defaultConfig: RateLimitConfig;
  private buckets: Map<string, Map<string, BucketState>> = new Map();

  constructor(defaultConfig?: Partial<RateLimitConfig>) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...defaultConfig };
  }

  /**
   * Set rate limit config for a specific agent.
   */
  setAgentConfig(agentId: string, config: Partial<RateLimitConfig>): void {
    this.configs.set(agentId, { ...this.defaultConfig, ...config });
  }

  /**
   * Check if a request is allowed. Returns {allowed, reason?, retryAfter?}.
   */
  check(agentId: string, opts: {
    tokens?: number;
    cost?: number;
  } = {}): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const config = this.configs.get(agentId) ?? this.defaultConfig;
    const now = Date.now();

    // Check requests per minute
    const rpmKey = `${agentId}:rpm`;
    if (!this.checkBucket(rpmKey, config.maxRequestsPerMinute, 60000, now)) {
      return { allowed: false, reason: `Rate limit: ${config.maxRequestsPerMinute} requests/minute exceeded`, retryAfterMs: 60000 };
    }

    // Check requests per hour
    const rphKey = `${agentId}:rph`;
    if (!this.checkBucket(rphKey, config.maxRequestsPerHour, 3600000, now)) {
      return { allowed: false, reason: `Rate limit: ${config.maxRequestsPerHour} requests/hour exceeded`, retryAfterMs: 3600000 };
    }

    // Check tokens per hour
    if (opts.tokens) {
      const tphKey = `${agentId}:tph`;
      if (!this.checkBucket(tphKey, config.maxTokensPerHour, 3600000, now, opts.tokens)) {
        return { allowed: false, reason: `Rate limit: ${config.maxTokensPerHour} tokens/hour exceeded`, retryAfterMs: 3600000 };
      }
    }

    // Check tokens per day
    if (opts.tokens) {
      const tpdKey = `${agentId}:tpd`;
      if (!this.checkBucket(tpdKey, config.maxTokensPerDay, 86400000, now, opts.tokens)) {
        return { allowed: false, reason: `Rate limit: ${config.maxTokensPerDay} tokens/day exceeded`, retryAfterMs: 86400000 };
      }
    }

    // Check cost per hour
    if (opts.cost) {
      const cphKey = `${agentId}:cph`;
      if (!this.checkBucket(cphKey, config.maxCostPerHour * 10000, 3600000, now, opts.cost * 10000)) {
        return { allowed: false, reason: `Rate limit: $${config.maxCostPerHour}/hour exceeded`, retryAfterMs: 3600000 };
      }
    }

    // Check cost per day
    if (opts.cost) {
      const cpdKey = `${agentId}:cpd`;
      if (!this.checkBucket(cpdKey, config.maxCostPerDay * 10000, 86400000, now, opts.cost * 10000)) {
        return { allowed: false, reason: `Rate limit: $${config.maxCostPerDay}/day exceeded`, retryAfterMs: 86400000 };
      }
    }

    return { allowed: true };
  }

  /**
   * Record that a request was made (consume from bucket).
   */
  consume(agentId: string, opts: { tokens?: number; cost?: number } = {}): void {
    const now = Date.now();

    this.addToBucket(`${agentId}:rpm`, 1, 60000, now);
    this.addToBucket(`${agentId}:rph`, 1, 3600000, now);

    if (opts.tokens) {
      this.addToBucket(`${agentId}:tph`, opts.tokens, 3600000, now);
      this.addToBucket(`${agentId}:tpd`, opts.tokens, 86400000, now);
    }

    if (opts.cost) {
      this.addToBucket(`${agentId}:cph`, opts.cost * 10000, 3600000, now);
      this.addToBucket(`${agentId}:cpd`, opts.cost * 10000, 86400000, now);
    }
  }

  /**
   * Get current usage for an agent.
   */
  getUsage(agentId: string): {
    requestsLastMinute: number;
    requestsLastHour: number;
    tokensLastHour: number;
    tokensLastDay: number;
    costLastHour: number;
    costLastDay: number;
  } {
    const now = Date.now();
    return {
      requestsLastMinute: this.getBucketValue(`${agentId}:rpm`, 60000, now),
      requestsLastHour: this.getBucketValue(`${agentId}:rph`, 3600000, now),
      tokensLastHour: this.getBucketValue(`${agentId}:tph`, 3600000, now),
      tokensLastDay: this.getBucketValue(`${agentId}:tpd`, 86400000, now),
      costLastHour: this.getBucketValue(`${agentId}:cph`, 3600000, now) / 10000,
      costLastDay: this.getBucketValue(`${agentId}:cpd`, 86400000, now) / 10000,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────

  private checkBucket(key: string, max: number, windowMs: number, now: number, cost = 1): boolean {
    const bucket = this.getBucket(key, windowMs, now);
    return bucket.tokens + cost <= max;
  }

  private addToBucket(key: string, amount: number, windowMs: number, now: number): void {
    const bucket = this.getBucket(key, windowMs, now);
    bucket.tokens += amount;
    bucket.lastRefill = now;
  }

  private getBucket(key: string, windowMs: number, now: number): BucketState {
    let agentBuckets = this.buckets.get(key);
    if (!agentBuckets) {
      agentBuckets = new Map();
      this.buckets.set(key, agentBuckets);
    }

    const bucketKey = String(Math.floor(now / windowMs));
    let bucket = agentBuckets.get(bucketKey);
    if (!bucket) {
      // Clean old buckets
      for (const [k] of agentBuckets) {
        if (parseInt(k) < parseInt(bucketKey) - 1) agentBuckets.delete(k);
      }
      bucket = { tokens: 0, lastRefill: now };
      agentBuckets.set(bucketKey, bucket);
    }

    return bucket;
  }

  private getBucketValue(key: string, windowMs: number, now: number): number {
    const agentBuckets = this.buckets.get(key);
    if (!agentBuckets) return 0;

    const bucketKey = String(Math.floor(now / windowMs));
    const bucket = agentBuckets.get(bucketKey);
    return bucket?.tokens ?? 0;
  }
}
