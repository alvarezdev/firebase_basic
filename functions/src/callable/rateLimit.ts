import {
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {consumeRateLimit, logNormalizedError, rateLimitError} from "../shared";

type CallableHandler<T = unknown, R = unknown> =
  (request: CallableRequest<T>) => R | Promise<R>;

/**
 * Apply distributed rate limiting to a callable handler.
 *
 * @param {string} operation Operation name.
 * @param {CallableHandler<T, R>} handler Callable handler.
 * @return {CallableHandler<T, R>} Rate-limited callable handler.
 */
export function withCallableRateLimit<T = unknown, R = unknown>(
  operation: string,
  handler: CallableHandler<T, R>
): CallableHandler<T, R> {
  return async (request) => {
    const clientId = getCallableClientId(request);
    const result = await consumeRateLimit({
      key: `callable:${operation}:${clientId}`,
    });

    if (!result.allowed) {
      const error = rateLimitError();
      logNormalizedError(error, {
        transport: "callable",
        operation,
        clientId,
        limit: result.limit,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      throw new HttpsError(error.callableCode, error.message);
    }

    return await handler(request);
  };
}

/**
 * Resolve a stable callable client identifier.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {string} Client identifier.
 */
function getCallableClientId(request: CallableRequest<unknown>): string {
  return request.auth?.uid ||
    request.rawRequest.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.rawRequest.ip ||
    request.rawRequest.socket.remoteAddress ||
    "unknown";
}
