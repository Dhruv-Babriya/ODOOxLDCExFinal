/**
 * Configurable Rate Limiting Configuration
 *
 * All rate limiting thresholds, windows, and backoff multipliers are completely
 * configurable via environment variables. If an environment variable is omitted
 * or invalid, safe, production-grade defaults are applied.
 */

export interface RateLimitConfig {
  /** Global master switch for rate limiting */
  enabled: boolean;

  /** Strictest Tier: Authentication routes (login, signup, password reset) */
  auth: {
    /** Maximum allowed attempts per IP within the window */
    ipLimit: number;
    /** Time window in seconds for IP-based auth tracking */
    ipWindowSeconds: number;

    /** Maximum allowed failed attempts per account/email within the window */
    accountLimit: number;
    /** Time window in seconds for account-based auth tracking */
    accountWindowSeconds: number;

    /** Exponential backoff settings (rather than a hard permanent lockout) */
    backoff: {
      /** Base delay in seconds applied after exceeding limits */
      baseDelaySeconds: number;
      /** Exponential multiplier applied per consecutive excess attempt */
      factor: number;
      /** Maximum delay ceiling in seconds */
      maxDelaySeconds: number;
      /** Inactivity cooldown in seconds after which backoff state is cleared */
      cooldownSeconds: number;
    };
  };

  /** Moderate Tier: Unauthenticated public routes & public forms */
  public: {
    /** Maximum allowed requests per IP within the window */
    ipLimit: number;
    /** Time window in seconds for public endpoint tracking */
    windowSeconds: number;
  };

  /** Loosest Tier: Authenticated member, manager, and staff actions */
  authenticated: {
    /** Maximum allowed requests per authenticated user ID within the window */
    userLimit: number;
    /** Time window in seconds for authenticated action tracking */
    windowSeconds: number;
  };
}

/**
 * Safely parse an environment variable as a number with boundary validation
 */
function parseEnvInt(key: string, defaultValue: number, min = 1, max = 86400): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Safely parse an environment variable as a float
 */
function parseEnvFloat(key: string, defaultValue: number, min = 1.0, max = 10.0): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Safely parse an environment variable as a boolean
 */
function parseEnvBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === null || raw.trim() === '') return defaultValue;
  const lower = raw.trim().toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Returns the active rate limit configuration with environment variable overrides
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    enabled: parseEnvBool('RATE_LIMIT_ENABLED', true),

    auth: {
      // Per-IP auth limit: default 5 attempts per 60 seconds
      ipLimit: parseEnvInt('RATE_LIMIT_AUTH_IP_MAX', 5, 1, 100),
      ipWindowSeconds: parseEnvInt('RATE_LIMIT_AUTH_IP_WINDOW_SECONDS', 60, 5, 3600),

      // Per-Account auth limit: default 5 attempts per 300 seconds (5 mins)
      accountLimit: parseEnvInt('RATE_LIMIT_AUTH_ACCOUNT_MAX', 5, 1, 50),
      accountWindowSeconds: parseEnvInt('RATE_LIMIT_AUTH_ACCOUNT_WINDOW_SECONDS', 300, 10, 86400),

      // Exponential backoff parameters
      backoff: {
        // Base delay: 2s (e.g. 2s -> 4s -> 8s -> 16s -> 32s -> 64s...)
        baseDelaySeconds: parseEnvInt('RATE_LIMIT_AUTH_BACKOFF_BASE_SECONDS', 2, 1, 60),
        factor: parseEnvFloat('RATE_LIMIT_AUTH_BACKOFF_FACTOR', 2.0, 1.1, 5.0),
        // Max delay ceiling: default 900s (15 minutes)
        maxDelaySeconds: parseEnvInt('RATE_LIMIT_AUTH_BACKOFF_MAX_SECONDS', 900, 10, 86400),
        // Cooldown: default 600s (10 minutes of no attempts resets the exponential penalty)
        cooldownSeconds: parseEnvInt('RATE_LIMIT_AUTH_BACKOFF_COOLDOWN_SECONDS', 600, 30, 86400),
      },
    },

    public: {
      // Public per-IP limit: default 60 requests per 60 seconds (1 req/sec average)
      ipLimit: parseEnvInt('RATE_LIMIT_PUBLIC_IP_MAX', 60, 5, 1000),
      windowSeconds: parseEnvInt('RATE_LIMIT_PUBLIC_WINDOW_SECONDS', 60, 5, 3600),
    },

    authenticated: {
      // Authenticated per-user limit: default 300 requests per 60 seconds (5 req/sec average)
      userLimit: parseEnvInt('RATE_LIMIT_AUTHED_USER_MAX', 300, 10, 5000),
      windowSeconds: parseEnvInt('RATE_LIMIT_AUTHED_WINDOW_SECONDS', 60, 5, 3600),
    },
  };
}
