import {logger} from "firebase-functions";

export type LogMetadata = Record<string, unknown>;

/**
 * Log a successful or relevant operational event.
 *
 * @param {string} message Log message.
 * @param {LogMetadata} metadata Context metadata.
 */
export function logInfo(message: string, metadata: LogMetadata = {}) {
  logger.info(message, metadata);
}

/**
 * Log an expected warning with structured metadata.
 *
 * @param {string} message Log message.
 * @param {LogMetadata} metadata Context metadata.
 */
export function logWarning(message: string, metadata: LogMetadata = {}) {
  logger.warn(message, metadata);
}

/**
 * Log an unexpected error with structured metadata.
 *
 * @param {string} message Log message.
 * @param {LogMetadata} metadata Context metadata.
 */
export function logError(message: string, metadata: LogMetadata = {}) {
  logger.error(message, metadata);
}
