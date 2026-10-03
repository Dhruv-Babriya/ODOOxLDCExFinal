import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  extractClientIp,
  classifyEndpoint,
  checkAuthRateLimit,
  checkPublicRateLimit,
  checkAuthenticatedRateLimit,
  type RateLimitCheckResult,
} from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // 1. Process Supabase user session and authentication redirection
  const supabaseResponse = await updateSession(request);

  // If updateSession generated a redirect (e.g. unauthenticated redirect to /login), allow immediately
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    return supabaseResponse;
  }

  // Retrieve authenticated user id if resolved by session handler
  const userId = supabaseResponse.headers.get('x-user-id');
  if (userId) {
    supabaseResponse.headers.delete('x-user-id');
  }

  // 2. Identify client IP and endpoint classification
  const clientIp = extractClientIp(request.headers);
  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(userId || pathname.startsWith('/dashboard'));

  const tier = classifyEndpoint(pathname, isAuthenticated);

  // 3. Enforce rate limiting appropriate to endpoint tier
  let rateResult: RateLimitCheckResult;

  if (tier === 'AUTH') {
    // Strictest: Authentication routes (Per-IP check at HTTP gate)
    rateResult = checkAuthRateLimit({ ip: clientIp });
  } else if (tier === 'AUTHENTICATED') {
    // Loosest: Authenticated member/staff user actions (Per-User)
    rateResult = checkAuthenticatedRateLimit(userId || clientIp, clientIp);
  } else {
    // Moderate: Unauthenticated public routes & assets (Per-IP)
    rateResult = checkPublicRateLimit(clientIp);
  }

  // 4. Handle rate limit rejection
  if (!rateResult.success) {
    const isHtml = request.headers.get('accept')?.includes('text/html');

    if (isHtml && request.method === 'GET') {
      const retryAfter = rateResult.retryAfterSeconds || rateResult.resetSeconds || 60;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rate Limit Exceeded — LDCEx</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
    .card { max-width: 440px; background: #18181b; border: 1px solid #27272a; padding: 2.25rem 2rem; border-radius: 1.25rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    .icon { font-size: 2.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.75rem 0; color: #fbbf24; }
    p { font-size: 0.875rem; color: #a1a1aa; line-height: 1.6; margin: 0 0 1.5rem 0; }
    .badge { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; padding: 0.5rem 1rem; background: #27272a; border: 1px solid #3f3f46; border-radius: 9999px; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏱️</div>
    <h1>Too Many Requests</h1>
    <p>${rateResult.errorMessage || 'You have exceeded the request limit. Please slow down and try again.'}</p>
    <div class="badge">Please retry in ${retryAfter} second${retryAfter === 1 ? '' : 's'}</div>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        status: 429,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...rateResult.headers,
        },
      });
    }

    return NextResponse.json(
      {
        error: rateResult.errorMessage || 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfterSeconds: rateResult.retryAfterSeconds,
      },
      {
        status: 429,
        headers: rateResult.headers,
      }
    );
  }

  // 5. Append rate limit headers to response
  for (const [headerName, headerValue] of Object.entries(rateResult.headers)) {
    supabaseResponse.headers.set(headerName, headerValue);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static media - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
