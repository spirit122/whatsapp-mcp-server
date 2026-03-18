// ─────────────────────────────────────────────
// Rate Limiter using Cloudflare KV
// Implements sliding window counter per client
// ─────────────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  free: { maxRequests: 100, windowSeconds: 3600 } satisfies RateLimitConfig,
  pro: { maxRequests: 1000, windowSeconds: 3600 } satisfies RateLimitConfig,
  enterprise: { maxRequests: 10000, windowSeconds: 3600 } satisfies RateLimitConfig,
};

export class RateLimiter {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, config: RateLimitConfig) {
    this.kv = kv;
    this.config = config;
  }

  async check(clientId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const key = `ratelimit:${clientId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.config.windowSeconds;

    // Get current window data
    const stored = await this.kv.get(key, "json") as {
      requests: number[];
    } | null;

    let requests = stored?.requests || [];

    // Remove expired entries
    requests = requests.filter((ts) => ts > windowStart);

    if (requests.length >= this.config.maxRequests) {
      const oldestInWindow = Math.min(...requests);
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestInWindow + this.config.windowSeconds,
      };
    }

    // Add current request
    requests.push(now);

    // Store with TTL
    await this.kv.put(key, JSON.stringify({ requests }), {
      expirationTtl: this.config.windowSeconds + 60,
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - requests.length,
      resetAt: now + this.config.windowSeconds,
    };
  }
}
