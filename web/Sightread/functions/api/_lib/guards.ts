/** Shared request guards for Pages Functions (search + NVIDIA proxies). */

export const MAX_SEARCH_QUERY_LENGTH = 500;
export const MAX_NVIDIA_BODY_BYTES = 4 * 1024 * 1024;
export const SEARCH_RATE_LIMIT = { max: 30, windowMs: 60_000 } as const;
export const NVIDIA_RATE_LIMIT = { max: 60, windowMs: 60_000 } as const;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (origin) return origin;
  const referer = request.headers.get("Referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Allow same-origin browser calls. Reject cross-origin POSTs that would
 * otherwise burn upstream API credits even when the response is opaque.
 */
export function isSameOriginRequest(request: Request): boolean {
  const pageOrigin = new URL(request.url).origin;
  const origin = getRequestOrigin(request);
  if (origin) return origin === pageOrigin;

  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  if (secFetchSite === "same-origin") return true;
  // Non-browser health probes (curl) typically omit Origin / Sec-Fetch-Site.
  if (request.method === "GET" || request.method === "HEAD") return true;
  return false;
}

export function clientRateLimitKey(request: Request, prefix: string): string {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";
  return `${prefix}:${ip}`;
}

export function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  const entry = rateBuckets.get(key);
  if (!entry || now >= entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Test-only: clear in-memory rate limit buckets. */
export function resetRateLimitsForTests(): void {
  rateBuckets.clear();
}

export function validateSearchQuery(
  query: unknown,
): { ok: true; query: string } | { ok: false; error: string } {
  if (!query || typeof query !== "string" || !query.trim()) {
    return { ok: false, error: "Missing query" };
  }
  const trimmed = query.trim();
  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    return {
      ok: false,
      error: `Query too long (max ${MAX_SEARCH_QUERY_LENGTH} characters)`,
    };
  }
  return { ok: true, query: trimmed };
}
