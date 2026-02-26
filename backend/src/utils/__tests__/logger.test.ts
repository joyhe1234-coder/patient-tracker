/**
 * Logger Utility Tests
 *
 * Verifies structured JSON output in production mode and human-readable
 * output in development mode. Mocks console methods to capture output.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// We need to re-import the module for each NODE_ENV scenario, so we use
// dynamic import + jest.unstable_mockModule / resetModules.

describe('logger', () => {
  // Spies on console methods
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('development mode (default in tests)', () => {
    // The test runner sets NODE_ENV=test, which is NOT 'production',
    // so the logger should use human-readable format.

    it('info outputs human-readable format via console.log', async () => {
      const { logger } = await import('../logger.js');
      logger.info('Server started');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[INFO\] .+ - Server started$/);
    });

    it('warn outputs human-readable format via console.warn', async () => {
      const { logger } = await import('../logger.js');
      logger.warn('Disk space low');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const output = warnSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[WARN\] .+ - Disk space low$/);
    });

    it('error outputs human-readable format via console.error', async () => {
      const { logger } = await import('../logger.js');
      logger.error('Connection failed');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const output = errorSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[ERROR\] .+ - Connection failed$/);
    });

    it('debug outputs human-readable format via console.log', async () => {
      const { logger } = await import('../logger.js');
      logger.debug('Cache miss');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[DEBUG\] .+ - Cache miss$/);
    });

    it('includes context object as second argument in dev mode', async () => {
      const { logger } = await import('../logger.js');
      const ctx = { userId: 42, action: 'login' };
      logger.info('User logged in', ctx);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const message = logSpy.mock.calls[0][0] as string;
      const contextArg = logSpy.mock.calls[0][1];
      expect(message).toMatch(/^\[INFO\] .+ - User logged in$/);
      expect(contextArg).toEqual(ctx);
    });

    it('does not include context when none is provided', async () => {
      const { logger } = await import('../logger.js');
      logger.info('No context here');

      expect(logSpy).toHaveBeenCalledTimes(1);
      // Only one argument (no context)
      expect(logSpy.mock.calls[0]).toHaveLength(1);
    });

    it('timestamp is a valid ISO-8601 string', async () => {
      const { logger } = await import('../logger.js');
      logger.info('Timestamp check');

      const output = logSpy.mock.calls[0][0] as string;
      // Extract the timestamp between [INFO] and - message
      const match = output.match(/^\[INFO\] (.+) - Timestamp check$/);
      expect(match).not.toBeNull();
      const ts = match![1];
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });

  // REMOVED (ln-630 audit B12.2): 'production mode (NODE_ENV=production)' (5 tests) —
  // created local jest.fn() mocks, manually built JSON objects, called JSON.stringify/JSON.parse.
  // Never imported or invoked the actual logger. Tests JSON serialization, not our logger.

  describe('all log levels route to correct console method', () => {
    it('info uses console.log', async () => {
      const { logger } = await import('../logger.js');
      logger.info('test');
      expect(logSpy).toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('warn uses console.warn', async () => {
      const { logger } = await import('../logger.js');
      logger.warn('test');
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('error uses console.error', async () => {
      const { logger } = await import('../logger.js');
      logger.error('test');
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('debug uses console.log', async () => {
      const { logger } = await import('../logger.js');
      logger.debug('test');
      expect(logSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
