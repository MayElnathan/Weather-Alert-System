interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request can proceed
   * @param key - Unique identifier for the rate limit (e.g., API endpoint)
   * @returns Object with canProceed boolean and retryAfter timestamp
   */
  canProceed(key: string): { canProceed: boolean; retryAfter?: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record) {
      // First request
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return { canProceed: true };
    }

    // Check if window has reset
    if (now >= record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return { canProceed: true };
    }

    // Check if we're under the limit
    if (record.count < this.config.maxRequests) {
      record.count++;
      return { canProceed: true };
    }

    // Rate limit exceeded
    return {
      canProceed: false,
      retryAfter: record.resetTime,
    };
  }

  /**
   * Get remaining requests for a key
   * @param key - Unique identifier for the rate limit
   * @returns Number of remaining requests
   */
  getRemainingRequests(key: string): number {
    const record = this.requests.get(key);
    if (!record) {
      return this.config.maxRequests;
    }

    const now = Date.now();
    if (now >= record.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - record.count);
  }

  /**
   * Get reset time for a key
   * @param key - Unique identifier for the rate limit
   * @returns Reset timestamp in milliseconds
   */
  getResetTime(key: string): number | null {
    const record = this.requests.get(key);
    return record ? record.resetTime : null;
  }

  /**
   * Clean up expired records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Create a global rate limiter instance for Tomorrow.io API
// Tomorrow.io free tier: 1000 requests per day = ~41 requests per hour
export const tomorrowIORateLimiter = new RateLimiter({
  maxRequests: 35, // Conservative limit to stay under 41/hour
  windowMs: 60 * 60 * 1000, // 1 hour window
  retryAfterMs: 60 * 1000, // 1 minute retry delay
});

// Clean up expired records every 5 minutes
setInterval(() => {
  tomorrowIORateLimiter.cleanup();
}, 5 * 60 * 1000);
