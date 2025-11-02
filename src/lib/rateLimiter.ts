interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config;
    this.startCleanup();
  }

  private startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        if (entry.resetTime < now) {
          this.limits.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || entry.resetTime < now) {
      const resetTime = now + this.config.windowMs;
      this.limits.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(identifier: string) {
    this.limits.delete(identifier);
  }
}

export const apiRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

export const strictRateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: RateLimiter = apiRateLimiter,
  getIdentifier: (...args: Parameters<T>) => string = () => 'default'
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = getIdentifier(...args);
    const limit = limiter.checkLimit(identifier);

    if (!limit.allowed) {
      const waitTime = Math.ceil((limit.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${waitTime} seconds.`);
    }

    return await fn(...args);
  }) as T;
}
