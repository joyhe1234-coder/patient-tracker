/**
 * Frontend logging utility.
 *
 * - **Production** (`import.meta.env.PROD`): suppresses `debug` and `info`,
 *   only `warn` and `error` produce console output.
 * - **Development / Test**: all levels produce console output.
 *
 * Wraps native console methods -- no external dependencies.
 */

/** Logger interface exposed by this module. */
export interface Logger {
  /** Informational messages. Suppressed in production. */
  info(message: string, ...args: unknown[]): void;
  /** Warning conditions. Always outputs. */
  warn(message: string, ...args: unknown[]): void;
  /** Error conditions. Always outputs. */
  error(message: string, ...args: unknown[]): void;
  /** Verbose / debug output. Suppressed in production. */
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Check if running in production mode.
 * Uses a function so tests can override import.meta.env.PROD.
 */
function isProduction(): boolean {
  try {
    return import.meta.env.PROD === true;
  } catch {
    // Fallback for test environments where import.meta.env may not exist
    return false;
  }
}

/** Singleton logger instance. */
export const logger: Logger = {
  info(message: string, ...args: unknown[]): void {
    if (!isProduction()) {
      console.log(message, ...args);
    }
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  },
  debug(message: string, ...args: unknown[]): void {
    if (!isProduction()) {
      console.log(message, ...args);
    }
  },
};
