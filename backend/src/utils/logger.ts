/**
 * Structured logging utility for the backend.
 *
 * - **Production** (NODE_ENV=production): outputs newline-delimited JSON
 *   with `timestamp`, `level`, `message`, and optional `context`.
 * - **Development / Test**: outputs human-readable format
 *   `[LEVEL] timestamp - message` followed by context (if any).
 *
 * Wraps native console methods -- no external dependencies.
 */

/** Optional structured context attached to a log entry. */
export interface LogContext {
  [key: string]: unknown;
}

/** Logger interface exposed by this module. */
export interface Logger {
  /** Informational messages (server start, config loaded, etc.) */
  info(message: string, context?: LogContext): void;
  /** Warning conditions that are not errors but deserve attention. */
  warn(message: string, context?: LogContext): void;
  /** Error conditions. */
  error(message: string, context?: LogContext): void;
  /** Verbose / debug output. Typically suppressed in production. */
  debug(message: string, context?: LogContext): void;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format an ISO-8601 timestamp string for the current instant.
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Write a structured JSON log line (production mode).
 */
function writeJson(
  level: string,
  message: string,
  context: LogContext | undefined,
  consoleFn: (...args: unknown[]) => void,
): void {
  const entry: Record<string, unknown> = {
    timestamp: timestamp(),
    level,
    message,
  };
  if (context !== undefined) {
    entry.context = context;
  }
  consoleFn(JSON.stringify(entry));
}

/**
 * Write a human-readable log line (development / test mode).
 */
function writeHuman(
  level: string,
  message: string,
  context: LogContext | undefined,
  consoleFn: (...args: unknown[]) => void,
): void {
  const ts = timestamp();
  if (context !== undefined) {
    consoleFn(`[${level}] ${ts} - ${message}`, context);
  } else {
    consoleFn(`[${level}] ${ts} - ${message}`);
  }
}

/**
 * Dispatch to the correct formatter based on NODE_ENV.
 */
function log(
  level: string,
  message: string,
  context: LogContext | undefined,
  consoleFn: (...args: unknown[]) => void,
): void {
  if (isProduction) {
    writeJson(level, message, context, consoleFn);
  } else {
    writeHuman(level, message, context, consoleFn);
  }
}

/** Singleton logger instance. */
export const logger: Logger = {
  info(message: string, context?: LogContext): void {
    log('INFO', message, context, console.log);
  },
  warn(message: string, context?: LogContext): void {
    log('WARN', message, context, console.warn);
  },
  error(message: string, context?: LogContext): void {
    log('ERROR', message, context, console.error);
  },
  debug(message: string, context?: LogContext): void {
    log('DEBUG', message, context, console.log);
  },
};
