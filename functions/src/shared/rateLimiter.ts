export type RateLimitConfig = {
  key: string;
  limit?: number;
  windowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const defaultLimit = 60;
const defaultWindowMs = 60 * 1000;
const buckets = new Map<string, RateLimitBucket>();

/**
 * Consume one request from an in-memory rate limit bucket.
 *
 * @param {RateLimitConfig} config Rate limit configuration.
 * @return {RateLimitResult} Rate limit decision.
 */
export function consumeRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const limit = config.limit ?? defaultLimit;
  const windowMs = config.windowMs ?? defaultWindowMs;
  const bucket = buckets.get(config.key);

  cleanupExpiredBuckets(now);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(config.key, {count: 1, resetAt});

    return buildResult(true, limit, limit - 1, resetAt, now);
  }

  if (bucket.count >= limit) {
    return buildResult(false, limit, 0, bucket.resetAt, now);
  }

  bucket.count += 1;
  return buildResult(true, limit, limit - bucket.count, bucket.resetAt, now);
}

/**
 * Clear rate limit buckets. Intended for tests.
 */
export function clearRateLimitBuckets() {
  buckets.clear();
}

/**
 * Build a serializable rate limit result.
 *
 * @param {boolean} allowed Whether the request is allowed.
 * @param {number} limit Maximum allowed requests.
 * @param {number} remaining Remaining requests in the window.
 * @param {number} resetAt Reset timestamp in milliseconds.
 * @param {number} now Current timestamp in milliseconds.
 * @return {RateLimitResult} Rate limit result.
 */
function buildResult(
  allowed: boolean,
  limit: number,
  remaining: number,
  resetAt: number,
  now: number
): RateLimitResult {
  return {
    allowed,
    limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    resetAt: new Date(resetAt).toISOString(),
  };
}

/**
 * Remove expired buckets opportunistically.
 *
 * @param {number} now Current timestamp in milliseconds.
 */
function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
