import {z} from "zod";

export * from "./schemas";

/**
 * Error used when an incoming request fails schema validation.
 */
export class RequestValidationError extends Error {
  details: string[];

  /**
   * Create a request validation error.
   *
   * @param {string[]} details Human-readable validation details.
   */
  constructor(details: string[]) {
    super("Invalid request data");
    this.details = details;
  }
}

/**
 * Validate unknown request data with a schema.
 *
 * @param {z.ZodType<T>} schema Schema used to validate the data.
 * @param {unknown} data Incoming request data.
 * @return {T} Parsed and normalized data.
 */
export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "request";
      return `${path}: ${issue.message}`;
    });

    throw new RequestValidationError(details);
  }

  return result.data;
}

/**
 * Check whether an error came from request schema validation.
 *
 * @param {unknown} error Unknown error.
 * @return {boolean} True when the error is a request validation error.
 */
export function isRequestValidationError(
  error: unknown
): error is RequestValidationError {
  return error instanceof RequestValidationError;
}
