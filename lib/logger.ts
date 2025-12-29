/**
 * Structured logging utility for the application
 *
 * @module lib/logger
 * @implements BR-029 - Structured Logging
 * @satisfies US-017 - Structured Logging
 * @tested __tests__/lib/logger.test.ts
 * Provides consistent logging with different severity levels
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', error, { endpoint: '/api/data' });
 * logger.warn('Rate limit approaching', { remaining: 5 });
 * ```
 */

export interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Log levels for filtering and categorization
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Determines if logging should be enabled based on environment
 */
const shouldLog = (level: LogLevel): boolean => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isTest = process.env.NODE_ENV === "test";

  // Don't log in test environment
  if (isTest) return false;

  // In production, only log WARN and ERROR
  if (!isDevelopment && (level === LogLevel.DEBUG || level === LogLevel.INFO)) {
    return false;
  }

  return true;
};

/**
 * Formats log message with timestamp and metadata
 */
const formatLog = (
  level: LogLevel,
  message: string,
  meta?: LogMetadata,
): string => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

/**
 * Logger utility with structured logging capabilities
 */
export const logger = {
  /**
   * Debug level logging - only shown in development
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  debug: (message: string, meta?: LogMetadata): void => {
    if (!shouldLog(LogLevel.DEBUG)) return;
    console.debug(formatLog(LogLevel.DEBUG, message, meta));
  },

  /**
   * Info level logging - shown in development
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info: (message: string, meta?: LogMetadata): void => {
    if (!shouldLog(LogLevel.INFO)) return;
    console.log(formatLog(LogLevel.INFO, message, meta));
  },

  /**
   * Warning level logging - shown in all environments
   * @param message - Warning message
   * @param meta - Optional metadata object
   */
  warn: (message: string, meta?: LogMetadata): void => {
    if (!shouldLog(LogLevel.WARN)) return;
    console.warn(formatLog(LogLevel.WARN, message, meta));
  },

  /**
   * Error level logging - shown in all environments
   * Automatically sends to Sentry in production
   * @param message - Error message
   * @param error - Optional Error object
   * @param meta - Optional metadata object
   */
  error: (message: string, error?: unknown, meta?: LogMetadata): void => {
    if (!shouldLog(LogLevel.ERROR)) return;

    const errorMeta = {
      ...meta,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };

    console.error(formatLog(LogLevel.ERROR, message, errorMeta));

    // In production, errors are automatically sent to Sentry via global error handler
    // No need to manually capture here
  },
};

/**
 * Create a logger with a specific context prefix
 * Useful for namespacing logs by module
 *
 * @param context - Context prefix for all logs (e.g., 'API:Plaid', 'Webhook:Clerk')
 * @returns Logger instance with context
 *
 * @example
 * ```typescript
 * const plaidLogger = createContextLogger('Plaid');
 * plaidLogger.info('Syncing transactions', { itemId: '123' });
 * // Output: [2024-01-01T00:00:00.000Z] [INFO] [Plaid] Syncing transactions {"itemId":"123"}
 * ```
 */
export const createContextLogger = (context: string) => ({
  debug: (message: string, meta?: LogMetadata) =>
    logger.debug(`[${context}] ${message}`, meta),
  info: (message: string, meta?: LogMetadata) =>
    logger.info(`[${context}] ${message}`, meta),
  warn: (message: string, meta?: LogMetadata) =>
    logger.warn(`[${context}] ${message}`, meta),
  error: (message: string, error?: unknown, meta?: LogMetadata) =>
    logger.error(`[${context}] ${message}`, error, meta),
});
