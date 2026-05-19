import type {FunctionsErrorCode} from "firebase-functions/v2/https";
import {
  isRequestValidationError,
  type RequestValidationError,
} from "../validation";
import {logError, logWarning, type LogMetadata} from "./logger";

export type AppErrorCode =
  | "validation"
  | "authentication"
  | "authorization"
  | "bad-request"
  | "method-not-allowed"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "internal";

export type NormalizedError = {
  code: AppErrorCode;
  message: string;
  httpStatus: number;
  callableCode: FunctionsErrorCode;
  details?: string[];
  shouldLogAsError: boolean;
};

/**
 * Application error with transport metadata.
 */
export class AppError extends Error {
  code: AppErrorCode;
  httpStatus: number;
  callableCode: FunctionsErrorCode;
  details?: string[];
  shouldLogAsError: boolean;

  /**
   * Create an application error.
   *
   * @param {object} params Error metadata.
   */
  constructor(params: NormalizedError) {
    super(params.message);
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.callableCode = params.callableCode;
    this.details = params.details;
    this.shouldLogAsError = params.shouldLogAsError;
  }
}

/**
 * Create an authentication error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function authenticationError(message = "Authentication required") {
  return new AppError({
    code: "authentication",
    message,
    httpStatus: 401,
    callableCode: "unauthenticated",
    shouldLogAsError: false,
  });
}

/**
 * Create an authorization error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function authorizationError(message = "Permission denied") {
  return new AppError({
    code: "authorization",
    message,
    httpStatus: 403,
    callableCode: "permission-denied",
    shouldLogAsError: false,
  });
}

/**
 * Create a bad request error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function badRequestError(message: string) {
  return new AppError({
    code: "bad-request",
    message,
    httpStatus: 400,
    callableCode: "invalid-argument",
    shouldLogAsError: false,
  });
}

/**
 * Create a method-not-allowed error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function methodNotAllowedError(message = "Method not allowed") {
  return new AppError({
    code: "method-not-allowed",
    message,
    httpStatus: 405,
    callableCode: "invalid-argument",
    shouldLogAsError: false,
  });
}

/**
 * Create a not-found error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function notFoundError(message = "Resource not found") {
  return new AppError({
    code: "not-found",
    message,
    httpStatus: 404,
    callableCode: "not-found",
    shouldLogAsError: false,
  });
}

/**
 * Create a conflict or invalid business state error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function conflictError(message: string) {
  return new AppError({
    code: "conflict",
    message,
    httpStatus: 409,
    callableCode: "failed-precondition",
    shouldLogAsError: false,
  });
}

/**
 * Create a rate limit error.
 *
 * @param {string} message Public error message.
 * @return {AppError} Application error.
 */
export function rateLimitError(message = "Too many requests") {
  return new AppError({
    code: "rate-limit",
    message,
    httpStatus: 429,
    callableCode: "resource-exhausted",
    shouldLogAsError: false,
  });
}

/**
 * Convert unknown caught errors into a consistent application error shape.
 *
 * @param {unknown} error Unknown caught error.
 * @param {string} fallbackMessage Fallback public message.
 * @param {number} fallbackStatus Fallback HTTP status code.
 * @return {NormalizedError} Normalized error metadata.
 */
export function normalizeError(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500
): NormalizedError {
  if (error instanceof AppError) {
    return error;
  }

  if (isRequestValidationError(error)) {
    return normalizeValidationError(error);
  }

  return {
    code: "internal",
    message: fallbackMessage,
    httpStatus: fallbackStatus,
    callableCode: "internal",
    shouldLogAsError: true,
  };
}

/**
 * Log a normalized error with safe structured metadata.
 *
 * @param {NormalizedError} error Normalized error.
 * @param {LogMetadata} metadata Context metadata.
 */
export function logNormalizedError(
  error: NormalizedError,
  metadata: LogMetadata = {}
) {
  const payload = {
    ...metadata,
    code: error.code,
    httpStatus: error.httpStatus,
    callableCode: error.callableCode,
  };

  if (error.shouldLogAsError) {
    logError(error.message, payload);
    return;
  }

  logWarning(error.message, payload);
}

/**
 * Normalize request validation errors.
 *
 * @param {RequestValidationError} error Request validation error.
 * @return {NormalizedError} Normalized validation error.
 */
function normalizeValidationError(
  error: RequestValidationError
): NormalizedError {
  return {
    code: "validation",
    message: error.message,
    httpStatus: 400,
    callableCode: "invalid-argument",
    details: error.details,
    shouldLogAsError: false,
  };
}
