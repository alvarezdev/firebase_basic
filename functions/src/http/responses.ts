import type {Response} from "express";
import {isRequestValidationError} from "../validation";

/**
 * Send a validation-aware error response.
 *
 * @param {Response} res HTTP response.
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback error message.
 * @param {number} statusCode Fallback HTTP status code.
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  fallbackMessage: string,
  statusCode = 400
) {
  if (isRequestValidationError(error)) {
    res.status(400).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  res.status(statusCode).json({error: fallbackMessage});
}
