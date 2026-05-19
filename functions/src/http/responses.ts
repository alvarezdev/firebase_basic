import type {Response} from "express";
import {
  logNormalizedError,
  normalizeError,
  type LogMetadata,
} from "../shared";

/**
 * Send a validation-aware error response.
 *
 * @param {Response} res HTTP response.
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 * @param {number} statusCode Fallback HTTP status code.
 * @param {LogMetadata} metadata Safe structured log metadata.
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  fallbackMessage: string,
  statusCode = 500,
  metadata: LogMetadata = {}
) {
  const normalizedError = normalizeError(error, fallbackMessage, statusCode);
  logNormalizedError(normalizedError, {
    transport: "http",
    ...metadata,
  });

  if (normalizedError.details) {
    res.status(normalizedError.httpStatus).json({
      error: normalizedError.message,
      details: normalizedError.details,
    });
    return;
  }

  res.status(normalizedError.httpStatus).json({
    error: normalizedError.message,
  });
}
