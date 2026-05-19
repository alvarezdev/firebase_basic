import {HttpsError} from "firebase-functions/v2/https";
import {isRequestValidationError} from "../validation";

/**
 * Convert validation and service errors to callable errors.
 *
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 */
export function throwCallableError(
  error: unknown,
  fallbackMessage: string
): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (isRequestValidationError(error)) {
    throw new HttpsError("invalid-argument", error.message, {
      details: error.details,
    });
  }

  throw new HttpsError("internal", fallbackMessage);
}
