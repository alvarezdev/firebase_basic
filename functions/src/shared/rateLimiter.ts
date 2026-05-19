import {createHash} from "crypto";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db} from "../config/firebase";

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
const rateLimitsCollection = db.collection("rateLimits");

/**
 * Consume one request from a distributed Firestore rate limit bucket.
 *
 * @param {RateLimitConfig} config Rate limit configuration.
 * @return {RateLimitResult} Rate limit decision.
 */
export async function consumeRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const limit = config.limit ?? defaultLimit;
  const windowMs = config.windowMs ?? defaultWindowMs;
  const docRef = rateLimitsCollection.doc(getRateLimitDocumentId(config.key));

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const bucket = getBucket(snapshot.data());

    if (!snapshot.exists || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      transaction.set(docRef, {
        key: config.key,
        count: 1,
        resetAt,
        expiresAt: Timestamp.fromMillis(resetAt + windowMs),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return buildResult(true, limit, limit - 1, resetAt, now);
    }

    if (bucket.count >= limit) {
      return buildResult(false, limit, 0, bucket.resetAt, now);
    }

    const nextCount = bucket.count + 1;
    transaction.update(docRef, {
      count: nextCount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return buildResult(true, limit, limit - nextCount, bucket.resetAt, now);
  });
}

/**
 * Clear rate limit buckets. Intended for tests and emulator resets.
 */
export async function clearRateLimitBuckets(): Promise<void> {
  const snapshot = await rateLimitsCollection.limit(500).get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
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
 * Convert Firestore data into a rate limit bucket.
 *
 * @param {Record<string, unknown> | undefined} data Firestore data.
 * @return {RateLimitBucket} Rate limit bucket.
 */
function getBucket(
  data: Record<string, unknown> | undefined
): RateLimitBucket {
  return {
    count: typeof data?.count === "number" ? data.count : 0,
    resetAt: typeof data?.resetAt === "number" ? data.resetAt : 0,
  };
}

/**
 * Build a safe deterministic document ID from a rate limit key.
 *
 * @param {string} key Rate limit key.
 * @return {string} Firestore document ID.
 */
function getRateLimitDocumentId(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
