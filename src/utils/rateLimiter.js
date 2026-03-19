// src/utils/rateLimiter.js
// In-memory rate limiter: 100 requests per minute per API key prefix.
// Note: resets on server restart / cold start — acceptable for MVP.

const store = new Map(); // key_prefix -> { count, resetAt }

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

/**
 * Check rate limit for a given identifier (API key prefix or IP).
 * @param {string} identifier
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(identifier) {
  const now = Date.now();
  let entry = store.get(identifier);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(identifier, entry);
  }

  entry.count += 1;

  const allowed = entry.count <= MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Apply rate limiting to a request. Throws a 429 Response if exceeded.
 * @param {string} identifier
 * @returns {Headers} rate limit headers to include in success responses
 */
export function applyRateLimit(identifier) {
  const { allowed, remaining, resetAt } = checkRateLimit(identifier);

  const headers = {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    throw Object.assign(
      Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
          },
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(retryAfter),
          },
        }
      )
    );
  }

  return headers;
}
