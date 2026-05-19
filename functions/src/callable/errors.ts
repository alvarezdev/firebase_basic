import {HttpsError} from "firebase-functions/v2/https";
import {
  logNormalizedError,
  logWarning,
  normalizeError,
  type LogMetadata,
} from "../shared";

/**
 * Convert validation and service errors to callable errors.
 *
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 * @param {LogMetadata} metadata Safe structured log metadata.
 */
export function throwCallableError(
  error: unknown,
  fallbackMessage: string,
  metadata: LogMetadata = {}
): never {
  if (error instanceof HttpsError) {
    logWarning(error.message, {
      transport: "callable",
      callableCode: error.code,
      ...metadata,
    });
    throw error;
  }

  const normalizedError = normalizeError(error, fallbackMessage);
  logNormalizedError(normalizedError, {
    transport: "callable",
    ...metadata,
  });

  throw new HttpsError(normalizedError.callableCode, normalizedError.message, {
    details: normalizedError.details,
  });
}
