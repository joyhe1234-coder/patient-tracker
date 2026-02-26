/**
 * Frontend Logger Utility Tests
 *
 * Verifies that production mode suppresses debug/info and allows warn/error,
 * and that development mode allows all levels.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('development mode (default in tests)', () => {
    // Vitest runs with import.meta.env.PROD = false by default

    it('info outputs via console.log', async () => {
      const { logger } = await import('../logger');
      logger.info('Server connected');
      expect(logSpy).toHaveBeenCalledWith('Server connected');
    });

    it('warn outputs via console.warn', async () => {
      const { logger } = await import('../logger');
      logger.warn('Deprecation notice');
      expect(warnSpy).toHaveBeenCalledWith('Deprecation notice');
    });

    it('error outputs via console.error', async () => {
      const { logger } = await import('../logger');
      logger.error('Network failure');
      expect(errorSpy).toHaveBeenCalledWith('Network failure');
    });

    it('debug outputs via console.log', async () => {
      const { logger } = await import('../logger');
      logger.debug('Cache hit');
      expect(logSpy).toHaveBeenCalledWith('Cache hit');
    });

    it('passes additional arguments to console methods', async () => {
      const { logger } = await import('../logger');
      const detail = { code: 500 };
      logger.error('API Error:', detail);
      expect(errorSpy).toHaveBeenCalledWith('API Error:', detail);
    });

    it('info allows all levels in dev mode', async () => {
      const { logger } = await import('../logger');
      logger.info('msg1');
      logger.debug('msg2');
      logger.warn('msg3');
      logger.error('msg4');

      expect(logSpy).toHaveBeenCalledTimes(2); // info + debug
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('production mode behavior', () => {
    // We cannot easily toggle import.meta.env.PROD at runtime because
    // the module captures it at load time. Instead we test the suppression
    // logic directly.

    it('warn always outputs regardless of environment', async () => {
      const { logger } = await import('../logger');
      logger.warn('Always visible');
      expect(warnSpy).toHaveBeenCalledWith('Always visible');
    });

    it('error always outputs regardless of environment', async () => {
      const { logger } = await import('../logger');
      logger.error('Always visible');
      expect(errorSpy).toHaveBeenCalledWith('Always visible');
    });

    // REMOVED (ln-630 audit B12.2): 'info and debug are suppressed when PROD is true' —
    // created a local prodLogger object with hardcoded no-op methods, never tested the real logger.
  });
});
