import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";
import {consumeRateLimit, rateLimitError} from "../shared";
import {sendErrorResponse} from "./responses";

type HttpHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Apply in-memory rate limiting to an HTTP handler.
 *
 * @param {string} operation Operation name.
 * @param {HttpHandler} handler HTTP handler.
 * @return {HttpHandler} Rate-limited HTTP handler.
 */
export function withHttpRateLimit(
  operation: string,
  handler: HttpHandler
): HttpHandler {
  return async (req, res) => {
    const clientId = getHttpClientId(req);
    const result = consumeRateLimit({
      key: `http:${operation}:${clientId}`,
    });

    res.setHeader("X-RateLimit-Limit", result.limit.toString());
    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    res.setHeader("X-RateLimit-Reset", result.resetAt);

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfterSeconds.toString());
      sendErrorResponse(res, rateLimitError(), "Too many requests", 429, {
        operation,
        clientId,
        limit: result.limit,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    await handler(req, res);
  };
}

/**
 * Resolve a stable HTTP client identifier.
 *
 * @param {Request} req HTTP request.
 * @return {string} Client identifier.
 */
function getHttpClientId(req: Request): string {
  return req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";
}
