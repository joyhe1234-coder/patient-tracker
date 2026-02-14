/**
 * validateEnv Unit Tests
 *
 * Tests for environment variable validation at startup.
 * Covers production mode (errors, process.exit) and development mode (warnings only).
 *
 * Requirements: REQ-SEC-04 (AC 1-4), REQ-SEC-05 (AC 1-6)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// ---- Mocks (ESM-compatible) ----

// Mock the logger so we can verify log calls without console output
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: mockLogger,
}));

// Mock config - we will override nodeEnv per test
const mockConfig = {
  nodeEnv: 'development',
  port: 3000,
};

jest.unstable_mockModule('../index.js', () => ({
  config: mockConfig,
}));

// Mock process.exit to prevent Jest from actually exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
  // Do nothing - prevent real exit
}) as unknown as (code?: string | number | null | undefined) => never);

// Store original env
const originalEnv = { ...process.env };

// Dynamic import AFTER mocks are set up (required for ESM)
const { validateEnv } = await import('../validateEnv.js');

describe('validateEnv', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset env to a clean state - remove all the vars validateEnv checks
    delete process.env.JWT_SECRET;
    delete process.env.SMTP_HOST;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    // Default to development mode
    mockConfig.nodeEnv = 'development';
    mockConfig.port = 3000;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  // ---- Helper: set all required env vars to valid values ----
  function setAllValid(): void {
    process.env.JWT_SECRET = 'a-very-long-secure-jwt-secret-that-is-at-least-32-characters';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.ADMIN_EMAIL = 'admin@mycompany.com';
    process.env.ADMIN_PASSWORD = 'SuperSecure!Pass99';
  }

  // ===========================================================================
  // Production Mode Tests
  // ===========================================================================
  describe('production mode', () => {
    beforeEach(() => {
      mockConfig.nodeEnv = 'production';
    });

    // --- JWT_SECRET validation (REQ-SEC-04 AC 1) ---
    it('should error when JWT_SECRET is missing in production', () => {
      setAllValid();
      delete process.env.JWT_SECRET;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('JWT_SECRET environment variable is required in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- JWT_SECRET default value (REQ-SEC-04 AC 2) ---
    it('should error when JWT_SECRET is the default development value in production', () => {
      setAllValid();
      process.env.JWT_SECRET = 'development_jwt_secret_change_in_production';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('JWT_SECRET must not use the default development value in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- JWT_SECRET too short (REQ-SEC-04 AC 3) ---
    it('should error when JWT_SECRET is shorter than 32 characters in production', () => {
      setAllValid();
      process.env.JWT_SECRET = 'short-secret'; // 12 chars

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('JWT_SECRET must be at least 32 characters'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- Valid JWT_SECRET passes (REQ-SEC-04 AC positive) ---
    it('should not error when JWT_SECRET is valid (>= 32 characters, non-default)', () => {
      setAllValid();

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockExit).not.toHaveBeenCalled();
    });

    // --- SMTP_HOST missing (REQ-SEC-05 AC 1) ---
    it('should error when SMTP_HOST is missing in production', () => {
      setAllValid();
      delete process.env.SMTP_HOST;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SMTP_HOST environment variable is required in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- SMTP_HOST empty string (REQ-SEC-05 AC 1) ---
    it('should error when SMTP_HOST is an empty string in production', () => {
      setAllValid();
      process.env.SMTP_HOST = '   ';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SMTP_HOST environment variable is required in production'),
        ]),
      );
    });

    // --- ADMIN_EMAIL missing (REQ-SEC-05 AC 1) ---
    it('should error when ADMIN_EMAIL is missing in production', () => {
      setAllValid();
      delete process.env.ADMIN_EMAIL;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ADMIN_EMAIL environment variable is required in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- ADMIN_EMAIL default value (REQ-SEC-05 AC 3) ---
    it('should error when ADMIN_EMAIL is the default value (admin@clinic.com) in production', () => {
      setAllValid();
      process.env.ADMIN_EMAIL = 'admin@clinic.com';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ADMIN_EMAIL must not use the default value in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- ADMIN_PASSWORD missing (REQ-SEC-05 AC 1) ---
    it('should error when ADMIN_PASSWORD is missing in production', () => {
      setAllValid();
      delete process.env.ADMIN_PASSWORD;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ADMIN_PASSWORD environment variable is required in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- ADMIN_PASSWORD default value (REQ-SEC-05 AC 4) ---
    it('should error when ADMIN_PASSWORD is the default value (changeme123) in production', () => {
      setAllValid();
      process.env.ADMIN_PASSWORD = 'changeme123';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ADMIN_PASSWORD must not use the default value in production'),
        ]),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- All valid (REQ-SEC-05 AC 5) ---
    it('should return valid: true with no errors when all env vars are correctly set', () => {
      setAllValid();

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(mockExit).not.toHaveBeenCalled();
    });

    // --- Multiple errors (REQ-SEC-05 AC 2) ---
    it('should report all errors when multiple env vars are invalid', () => {
      // Do NOT call setAllValid() - leave everything missing
      mockConfig.nodeEnv = 'production';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      // Should have errors for JWT_SECRET, SMTP_HOST, ADMIN_EMAIL, ADMIN_PASSWORD
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
      expect(result.errors.some(e => e.includes('SMTP_HOST'))).toBe(true);
      expect(result.errors.some(e => e.includes('ADMIN_EMAIL'))).toBe(true);
      expect(result.errors.some(e => e.includes('ADMIN_PASSWORD'))).toBe(true);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- process.exit(1) called on production errors ---
    it('should call process.exit(1) when production validation fails', () => {
      // Leave all env vars missing in production
      const result = validateEnv();

      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    // --- Config summary logged on success (REQ-SEC-05 AC 5) ---
    it('should log a configuration summary on successful validation', () => {
      setAllValid();

      validateEnv();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Configuration validated',
        expect.objectContaining({
          NODE_ENV: 'production',
          PORT: 3000,
          jwtSecretLength: expect.any(Number),
        }),
      );
    });

    // --- Summary does not reveal secret values (REQ-SEC-05 AC 5) ---
    it('should not reveal secret values in the configuration summary', () => {
      setAllValid();

      validateEnv();

      // Check that logger.info was called, and extract the context
      const infoCall = mockLogger.info.mock.calls.find(
        (call: unknown[]) => call[0] === 'Configuration validated',
      );
      expect(infoCall).toBeDefined();
      const context = infoCall![1] as Record<string, unknown>;

      // Should log length, not the actual secret
      expect(context.jwtSecretLength).toBe(process.env.JWT_SECRET!.length);
      // The context should not contain the raw JWT secret value
      expect(JSON.stringify(context)).not.toContain(process.env.JWT_SECRET);
      // SMTP host should be masked
      expect(context.smtpHost).toBe('(set)');
    });

    // --- Errors logged before exit ---
    it('should log all errors before calling process.exit', () => {
      // Leave all env vars missing
      validateEnv();

      // logger.error should be called for each error + the "Exiting" message
      expect(mockLogger.error).toHaveBeenCalled();
      const errorMessages = mockLogger.error.mock.calls.map(
        (call: unknown[]) => call[0] as string,
      );
      expect(errorMessages).toContain('Environment validation failed. Exiting.');
    });
  });

  // ===========================================================================
  // Development Mode Tests
  // ===========================================================================
  describe('development mode', () => {
    beforeEach(() => {
      mockConfig.nodeEnv = 'development';
    });

    // --- Missing vars produce warnings only (REQ-SEC-04 AC 4) ---
    it('should return valid: true when env vars are missing in development', () => {
      // All env vars are already deleted in beforeEach

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(mockExit).not.toHaveBeenCalled();
    });

    // --- Default values produce warnings only ---
    it('should return valid: true with warnings when default values are used in development', () => {
      process.env.JWT_SECRET = 'development_jwt_secret_change_in_production';
      process.env.ADMIN_EMAIL = 'admin@clinic.com';
      process.env.ADMIN_PASSWORD = 'changeme123';
      // SMTP_HOST left unset

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(mockExit).not.toHaveBeenCalled();
    });

    // --- Warnings logged for missing JWT_SECRET (REQ-SEC-04 AC 4) ---
    it('should log a warning when JWT_SECRET is not set in development', () => {
      delete process.env.JWT_SECRET;

      validateEnv();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Using default JWT secret'),
      );
    });

    // --- Warnings logged for short JWT_SECRET ---
    it('should log a warning when JWT_SECRET is short in development', () => {
      process.env.JWT_SECRET = 'tooshort';

      validateEnv();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET is shorter than 32 characters'),
      );
    });

    // --- Warnings logged for default ADMIN_EMAIL ---
    it('should log a warning when ADMIN_EMAIL is the default in development', () => {
      process.env.ADMIN_EMAIL = 'admin@clinic.com';

      validateEnv();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ADMIN_EMAIL is set to default value'),
      );
    });

    // --- Warnings logged for default ADMIN_PASSWORD ---
    it('should log a warning when ADMIN_PASSWORD is the default in development', () => {
      process.env.ADMIN_PASSWORD = 'changeme123';

      validateEnv();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ADMIN_PASSWORD is set to default value'),
      );
    });

    // --- Development mode never calls process.exit ---
    it('should never call process.exit in development mode regardless of env state', () => {
      // Leave everything unset or default
      process.env.JWT_SECRET = 'development_jwt_secret_change_in_production';
      process.env.ADMIN_EMAIL = 'admin@clinic.com';
      process.env.ADMIN_PASSWORD = 'changeme123';

      validateEnv();

      expect(mockExit).not.toHaveBeenCalled();
    });

    // --- Logs config summary even in development ---
    it('should log a configuration summary in development mode', () => {
      setAllValid();

      validateEnv();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Configuration validated',
        expect.objectContaining({
          NODE_ENV: 'development',
        }),
      );
    });
  });

  // ===========================================================================
  // Return Value Structure Tests
  // ===========================================================================
  describe('return value structure', () => {
    it('should return an EnvValidationResult with valid, errors, and warnings fields', () => {
      const result = validateEnv();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
