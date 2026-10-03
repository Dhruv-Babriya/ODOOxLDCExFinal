/**
 * Rate Limiter Engine
 *
 * Provides endpoint classification, client IP extraction, and tiered rate limit
 * enforcement across:
 * 1. Authentication routes (Per-IP & Per-Account with exponential backoff)
 * 2. Public endpoints (Moderate Per-IP limit)
 * 3. Authenticated user actions (Looser Per-User limit)
 */

import { getRateLimitConfig } from './config';
import { rateLimitStore, type RateLimitStatus } from './store';

export type EndpointTier = 'AUTH' | 'PUBLIC' | 'AUTHENTICATED';

export interface RateLimitCheckResult {
  success: boolean;
  tier: EndpointTier;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
  blockedTarget?: 'IP' | 'ACCOUNT' | 'USER';
  errorMessage?: string;
  headers: Record<string, string>;
}

/**
 * Extracts the real client IP address from request headers
 */
export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const getHeader = (name: string): string | null => {
    if ('get' in headers && typeof headers.get === 'function') {
      return headers.get(name);
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return val || null;
  };

  // Standard reverse proxy headers in priority order
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = getHeader('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  const cfConnectingIp = getHeader('cf-connecting-ip');
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  const fastlyClientIp = getHeader('fastly-client-ip');
  if (fastlyClientIp?.trim()) return fastlyClientIp.trim();

  return '127.0.0.1';
}

/**
 * Normalizes an account identifier (e.g. email) for consistent keying
 */
export function normalizeAccountIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/**
 * Classifies an incoming route pathname into its respective rate limiting tier
 */
export function classifyEndpoint(pathname: string, isAuthenticated = false): EndpointTier {
  const normalized = pathname.toLowerCase();

  // 1. Strictest: Authentication endpoints
  if (
    normalized === '/login' ||
    normalized === '/register' ||
    normalized === '/forgot-password' ||
    normalized === '/reset-password' ||
    normalized.startsWith('/auth') ||
    normalized.startsWith('/api/auth')
  ) {
    return 'AUTH';
  }

  // 2. Loosest: Authenticated dashboard and actions
  if (normalized.startsWith('/dashboard') || isAuthenticated) {
    return 'AUTHENTICATED';
  }

  // 3. Moderate: Public pages & endpoints
  return 'PUBLIC';
}

/**
 * Builds standard RFC-compliant rate limit HTTP response headers
 */
function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetSeconds: number,
  retryAfterSeconds?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(resetSeconds),
  };

  if (retryAfterSeconds && retryAfterSeconds > 0) {
    headers['Retry-After'] = String(retryAfterSeconds);
  }

  return headers;
}

/**
 * Enforces rate limiting on authentication routes using a combination of
 * Per-IP and Per-Account limits with exponential backoff.
 */
export function checkAuthRateLimit(options: {
  ip: string;
  account?: string | null;
}): RateLimitCheckResult {
  const config = getRateLimitConfig();

  // If rate limiting is globally disabled
  if (!config.enabled) {
    return {
      success: true,
      tier: 'AUTH',
      limit: config.auth.ipLimit,
      remaining: config.auth.ipLimit,
      resetSeconds: config.auth.ipWindowSeconds,
      headers: buildRateLimitHeaders(config.auth.ipLimit, config.auth.ipLimit, config.auth.ipWindowSeconds),
    };
  }

  const { ip, account } = options;
  const ipKey = `ratelimit:auth:ip:${ip}`;
  const ipBackoffKey = `backoff:auth:ip:${ip}`;

  // 1. Check Per-Account limit & backoff (if account is supplied)
  if (account) {
    const normalizedAccount = normalizeAccountIdentifier(account);
    const accountKey = `ratelimit:auth:account:${normalizedAccount}`;
    const accountBackoffKey = `backoff:auth:account:${normalizedAccount}`;

    const accountStatus: RateLimitStatus = rateLimitStore.checkLimit(
      accountKey,
      config.auth.accountLimit,
      config.auth.accountWindowSeconds,
      accountBackoffKey
    );

    if (!accountStatus.allowed) {
      const retryAfter = accountStatus.retryAfterSeconds || accountStatus.resetSeconds;
      const msg =
        accountStatus.reason === 'EXPONENTIAL_BACKOFF_ACTIVE'
          ? `Too many sign-in attempts for this account. For security, please wait ${retryAfter} second${
              retryAfter === 1 ? '' : 's'
            } before trying again.`
          : `Too many authentication attempts for this account. Please try again in ${retryAfter} second${
              retryAfter === 1 ? '' : 's'
            }.`;

      return {
        success: false,
        tier: 'AUTH',
        limit: config.auth.accountLimit,
        remaining: 0,
        resetSeconds: accountStatus.resetSeconds,
        retryAfterSeconds: retryAfter,
        blockedTarget: 'ACCOUNT',
        errorMessage: msg,
        headers: buildRateLimitHeaders(config.auth.accountLimit, 0, accountStatus.resetSeconds, retryAfter),
      };
    }
  }

  // 2. Check Per-IP limit & backoff
  const ipStatus: RateLimitStatus = rateLimitStore.checkLimit(
    ipKey,
    config.auth.ipLimit,
    config.auth.ipWindowSeconds,
    ipBackoffKey
  );

  if (!ipStatus.allowed) {
    const retryAfter = ipStatus.retryAfterSeconds || ipStatus.resetSeconds;
    const msg =
      ipStatus.reason === 'EXPONENTIAL_BACKOFF_ACTIVE'
        ? `Too many authentication attempts from this IP address. Please wait ${retryAfter} second${
            retryAfter === 1 ? '' : 's'
          } before trying again.`
        : `Too many sign-in attempts from your network. Please wait ${retryAfter} second${
            retryAfter === 1 ? '' : 's'
          } before trying again.`;

    return {
      success: false,
      tier: 'AUTH',
      limit: config.auth.ipLimit,
      remaining: 0,
      resetSeconds: ipStatus.resetSeconds,
      retryAfterSeconds: retryAfter,
      blockedTarget: 'IP',
      errorMessage: msg,
      headers: buildRateLimitHeaders(config.auth.ipLimit, 0, ipStatus.resetSeconds, retryAfter),
    };
  }

  return {
    success: true,
    tier: 'AUTH',
    limit: config.auth.ipLimit,
    remaining: ipStatus.remaining,
    resetSeconds: ipStatus.resetSeconds,
    headers: buildRateLimitHeaders(config.auth.ipLimit, ipStatus.remaining, ipStatus.resetSeconds),
  };
}

/**
 * Records a failed authentication attempt on both IP and Account, escalating
 * exponential backoff delay as consecutive failures accumulate.
 */
export function recordAuthFailure(options: {
  ip: string;
  account?: string | null;
}): { delaySeconds: number; accountDelaySeconds?: number } {
  const config = getRateLimitConfig();
  if (!config.enabled) return { delaySeconds: 0 };

  const backoffOptions = {
    threshold: config.auth.accountLimit,
    baseDelaySeconds: config.auth.backoff.baseDelaySeconds,
    factor: config.auth.backoff.factor,
    maxDelaySeconds: config.auth.backoff.maxDelaySeconds,
    cooldownSeconds: config.auth.backoff.cooldownSeconds,
  };

  let accountDelaySeconds = 0;
  if (options.account) {
    const normalizedAccount = normalizeAccountIdentifier(options.account);
    const accountBackoffKey = `backoff:auth:account:${normalizedAccount}`;
    const res = rateLimitStore.recordAuthFailure(accountBackoffKey, backoffOptions);
    accountDelaySeconds = res.delaySeconds;
  }

  // Also record on IP
  const ipBackoffKey = `backoff:auth:ip:${options.ip}`;
  const ipRes = rateLimitStore.recordAuthFailure(ipBackoffKey, {
    ...backoffOptions,
    threshold: config.auth.ipLimit,
  });

  return {
    delaySeconds: Math.max(ipRes.delaySeconds, accountDelaySeconds),
    accountDelaySeconds,
  };
}

/**
 * Records a successful authentication, resetting backoff state on both IP and Account.
 */
export function recordAuthSuccess(options: { ip: string; account?: string | null }): void {
  const ipBackoffKey = `backoff:auth:ip:${options.ip}`;
  rateLimitStore.recordAuthSuccess(ipBackoffKey);

  if (options.account) {
    const normalizedAccount = normalizeAccountIdentifier(options.account);
    const accountBackoffKey = `backoff:auth:account:${normalizedAccount}`;
    rateLimitStore.recordAuthSuccess(accountBackoffKey);
  }
}

/**
 * Enforces rate limiting on unauthenticated public routes
 */
export function checkPublicRateLimit(ip: string): RateLimitCheckResult {
  const config = getRateLimitConfig();

  if (!config.enabled) {
    return {
      success: true,
      tier: 'PUBLIC',
      limit: config.public.ipLimit,
      remaining: config.public.ipLimit,
      resetSeconds: config.public.windowSeconds,
      headers: buildRateLimitHeaders(config.public.ipLimit, config.public.ipLimit, config.public.windowSeconds),
    };
  }

  const key = `ratelimit:public:ip:${ip}`;
  const status: RateLimitStatus = rateLimitStore.checkLimit(
    key,
    config.public.ipLimit,
    config.public.windowSeconds
  );

  if (!status.allowed) {
    const retryAfter = status.retryAfterSeconds || status.resetSeconds;
    return {
      success: false,
      tier: 'PUBLIC',
      limit: config.public.ipLimit,
      remaining: 0,
      resetSeconds: status.resetSeconds,
      retryAfterSeconds: retryAfter,
      blockedTarget: 'IP',
      errorMessage: `Too many requests. Please slow down and try again in ${retryAfter} second${
        retryAfter === 1 ? '' : 's'
      }.`,
      headers: buildRateLimitHeaders(config.public.ipLimit, 0, status.resetSeconds, retryAfter),
    };
  }

  return {
    success: true,
    tier: 'PUBLIC',
    limit: config.public.ipLimit,
    remaining: status.remaining,
    resetSeconds: status.resetSeconds,
    headers: buildRateLimitHeaders(config.public.ipLimit, status.remaining, status.resetSeconds),
  };
}

/**
 * Enforces looser rate limiting on authenticated user actions
 */
export function checkAuthenticatedRateLimit(
  userId: string,
  fallbackIp = '127.0.0.1'
): RateLimitCheckResult {
  const config = getRateLimitConfig();

  if (!config.enabled) {
    return {
      success: true,
      tier: 'AUTHENTICATED',
      limit: config.authenticated.userLimit,
      remaining: config.authenticated.userLimit,
      resetSeconds: config.authenticated.windowSeconds,
      headers: buildRateLimitHeaders(
        config.authenticated.userLimit,
        config.authenticated.userLimit,
        config.authenticated.windowSeconds
      ),
    };
  }

  const key = userId ? `ratelimit:authed:user:${userId}` : `ratelimit:authed:ip:${fallbackIp}`;
  const status: RateLimitStatus = rateLimitStore.checkLimit(
    key,
    config.authenticated.userLimit,
    config.authenticated.windowSeconds
  );

  if (!status.allowed) {
    const retryAfter = status.retryAfterSeconds || status.resetSeconds;
    return {
      success: false,
      tier: 'AUTHENTICATED',
      limit: config.authenticated.userLimit,
      remaining: 0,
      resetSeconds: status.resetSeconds,
      retryAfterSeconds: retryAfter,
      blockedTarget: 'USER',
      errorMessage: `High request volume detected for your session. Please wait ${retryAfter} second${
        retryAfter === 1 ? '' : 's'
      } before continuing.`,
      headers: buildRateLimitHeaders(config.authenticated.userLimit, 0, status.resetSeconds, retryAfter),
    };
  }

  return {
    success: true,
    tier: 'AUTHENTICATED',
    limit: config.authenticated.userLimit,
    remaining: status.remaining,
    resetSeconds: status.resetSeconds,
    headers: buildRateLimitHeaders(config.authenticated.userLimit, status.remaining, status.resetSeconds),
  };
}
