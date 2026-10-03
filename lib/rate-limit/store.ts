/**
 * In-Memory Rate Limiting & Exponential Backoff Store
 *
 * Implements a high-throughput, sliding-window rate limiter paired with
 * exponential backoff tracking for authentication targets (per-IP and per-account).
 *
 * Utilizes a globalThis singleton to preserve state across Next.js worker invocations
 * and module reloads, with automatic garbage collection of expired buckets.
 */

export interface WindowRecord {
  /** Timestamp array of requests within the active sliding window (in ms) */
  timestamps: number[];
  /** When this record was last modified */
  updatedAt: number;
}

export interface BackoffRecord {
  /** Count of consecutive failed attempts / excess requests */
  consecutiveFailures: number;
  /** Epoch timestamp (ms) until which the client/account is throttled */
  blockedUntil: number;
  /** Epoch timestamp (ms) of the last failed attempt */
  lastFailureAt: number;
}

export interface RateLimitStatus {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Max allowed within the window */
  limit: number;
  /** Remaining attempts in the current window */
  remaining: number;
  /** Seconds until the current window resets */
  resetSeconds: number;
  /** If throttled due to backoff, seconds remaining before retry is permitted */
  retryAfterSeconds?: number;
  /** Current backoff delay tier in seconds */
  backoffDelaySeconds?: number;
  /** Reason for rejection if not allowed */
  reason?: 'RATE_LIMIT_EXCEEDED' | 'EXPONENTIAL_BACKOFF_ACTIVE';
}

export class RateLimitMemoryStore {
  private windows: Map<string, WindowRecord> = new Map();
  private backoffs: Map<string, BackoffRecord> = new Map();
  private lastCleanup: number = Date.now();
  private readonly cleanupIntervalMs = 60_000; // Run GC every 60 seconds

  /**
   * Evaluates if a request is allowed under a sliding window, and optionally
   * checks if an active exponential backoff delay is currently blocking the key.
   */
  public checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    backoffKey?: string
  ): RateLimitStatus {
    const now = Date.now();
    this.maybeCleanup(now);

    // 1. Check Exponential Backoff if backoffKey is provided
    if (backoffKey) {
      const backoff = this.backoffs.get(backoffKey);
      if (backoff && now < backoff.blockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((backoff.blockedUntil - now) / 1000));
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetSeconds: retryAfterSeconds,
          retryAfterSeconds,
          reason: 'EXPONENTIAL_BACKOFF_ACTIVE',
        };
      }
    }

    // 2. Sliding Window check
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let record = this.windows.get(key);
    if (!record) {
      record = { timestamps: [], updatedAt: now };
      this.windows.set(key, record);
    }

    // Prune timestamps older than windowStart
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    record.updatedAt = now;

    const count = record.timestamps.length;

    // Calculate reset time based on the oldest timestamp in window
    let resetSeconds = windowSeconds;
    if (record.timestamps.length > 0) {
      const oldest = record.timestamps[0];
      resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    }

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
        retryAfterSeconds: resetSeconds,
        reason: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Record this attempt
    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.timestamps.length),
      resetSeconds,
    };
  }

  /**
   * Records a failed authentication attempt and calculates the next exponential backoff delay.
   * Rather than a hard lockout, consecutive failures escalate the wait time exponentially.
   */
  public recordAuthFailure(
    backoffKey: string,
    options: {
      threshold: number;
      baseDelaySeconds: number;
      factor: number;
      maxDelaySeconds: number;
      cooldownSeconds: number;
    }
  ): { consecutiveFailures: number; blockedUntil: number; delaySeconds: number } {
    const now = Date.now();
    let backoff = this.backoffs.get(backoffKey);

    // If previous backoff exists and cooldown period has passed with no attempts, reset
    if (backoff && now - backoff.lastFailureAt > options.cooldownSeconds * 1000) {
      backoff = undefined;
    }

    const currentFailures = (backoff?.consecutiveFailures ?? 0) + 1;

    let delaySeconds = 0;
    let blockedUntil = now;

    // Apply exponential backoff once failures reach or exceed the threshold
    if (currentFailures >= options.threshold) {
      const excessAttempts = currentFailures - options.threshold;
      // Exponential formula: baseDelay * (factor ^ excessAttempts)
      const calculatedDelay = options.baseDelaySeconds * Math.pow(options.factor, excessAttempts);
      delaySeconds = Math.min(Math.round(calculatedDelay), options.maxDelaySeconds);
      blockedUntil = now + delaySeconds * 1000;
    }

    this.backoffs.set(backoffKey, {
      consecutiveFailures: currentFailures,
      blockedUntil,
      lastFailureAt: now,
    });

    return {
      consecutiveFailures: currentFailures,
      blockedUntil,
      delaySeconds,
    };
  }

  /**
   * Resets exponential backoff upon successful authentication.
   */
  public recordAuthSuccess(backoffKey: string): void {
    this.backoffs.delete(backoffKey);
  }

  /**
   * Explicitly clears a rate limit key (useful for tests or admin unlocks)
   */
  public resetKey(key: string): void {
    this.windows.delete(key);
    this.backoffs.delete(key);
  }

  /**
   * Automatic garbage collection of expired window and backoff entries
   */
  private maybeCleanup(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;
    this.lastCleanup = now;

    // Cleanup sliding windows older than 1 hour
    const maxWindowAge = 3600_000;
    for (const [key, record] of this.windows.entries()) {
      if (now - record.updatedAt > maxWindowAge) {
        this.windows.delete(key);
      }
    }

    // Cleanup backoff records older than their blockedUntil + 1 hour
    for (const [key, record] of this.backoffs.entries()) {
      if (now > record.blockedUntil + 3600_000) {
        this.backoffs.delete(key);
      }
    }
  }
}

// Global singleton preservation for Next.js environments
declare global {
  var __rateLimitStore: RateLimitMemoryStore | undefined;
}

export const rateLimitStore: RateLimitMemoryStore =
  globalThis.__rateLimitStore ?? (globalThis.__rateLimitStore = new RateLimitMemoryStore());
