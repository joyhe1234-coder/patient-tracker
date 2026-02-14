import { logger } from '../utils/logger.js';
import { config } from './index.js';

/**
 * Result of environment variable validation at startup.
 * Used by validateEnv() to report errors and warnings.
 */
export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** The default JWT secret that ships with the codebase (must not be used in production). */
const DEFAULT_JWT_SECRET = 'development_jwt_secret_change_in_production';

/** The default admin email (must not be used in production). */
const DEFAULT_ADMIN_EMAIL = 'admin@clinic.com';

/** The default admin password (must not be used in production). */
const DEFAULT_ADMIN_PASSWORD = 'changeme123';

/** Minimum acceptable length for JWT_SECRET. */
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Validate required environment variables at startup.
 *
 * In production mode (NODE_ENV=production):
 *   - Validates JWT_SECRET is set, not the default value, and >= 32 characters
 *   - Validates SMTP_HOST is set and non-empty
 *   - Validates ADMIN_EMAIL is set and not the default value
 *   - Validates ADMIN_PASSWORD is set and not the default value
 *   - If any validation fails, logs all errors and calls process.exit(1)
 *
 * In development mode:
 *   - Logs warnings for missing or default values but returns valid: true
 *
 * On success: logs a configuration summary without revealing secret values.
 *
 * Requirements: REQ-SEC-04 (AC 1-4), REQ-SEC-05 (AC 1-6)
 */
export function validateEnv(): EnvValidationResult {
  const isProduction = config.nodeEnv === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- JWT_SECRET validation (REQ-SEC-04) ---
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET environment variable is required in production');
    } else {
      warnings.push('WARNING: Using default JWT secret. Set JWT_SECRET for production.');
    }
  } else if (jwtSecret === DEFAULT_JWT_SECRET) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET must not use the default development value in production');
    } else {
      warnings.push('WARNING: Using default JWT secret. Set JWT_SECRET for production.');
    }
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    if (isProduction) {
      errors.push(`FATAL: JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
    } else {
      warnings.push(`WARNING: JWT_SECRET is shorter than ${MIN_JWT_SECRET_LENGTH} characters. Use a stronger secret for production.`);
    }
  }

  // --- SMTP_HOST validation (REQ-SEC-05) ---
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost || smtpHost.trim() === '') {
    if (isProduction) {
      errors.push('FATAL: SMTP_HOST environment variable is required in production');
    } else {
      warnings.push('WARNING: SMTP_HOST is not set. Email features will not work.');
    }
  }

  // --- ADMIN_EMAIL validation (REQ-SEC-05) ---
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail || adminEmail.trim() === '') {
    if (isProduction) {
      errors.push('FATAL: ADMIN_EMAIL environment variable is required in production');
    } else {
      warnings.push('WARNING: ADMIN_EMAIL is not set. Using default value.');
    }
  } else if (adminEmail === DEFAULT_ADMIN_EMAIL) {
    if (isProduction) {
      errors.push('FATAL: ADMIN_EMAIL must not use the default value in production');
    } else {
      warnings.push('WARNING: ADMIN_EMAIL is set to default value. Change it for production.');
    }
  }

  // --- ADMIN_PASSWORD validation (REQ-SEC-05) ---
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.trim() === '') {
    if (isProduction) {
      errors.push('FATAL: ADMIN_PASSWORD environment variable is required in production');
    } else {
      warnings.push('WARNING: ADMIN_PASSWORD is not set. Using default value.');
    }
  } else if (adminPassword === DEFAULT_ADMIN_PASSWORD) {
    if (isProduction) {
      errors.push('FATAL: ADMIN_PASSWORD must not use the default value in production');
    } else {
      warnings.push('WARNING: ADMIN_PASSWORD is set to default value. Change it for production.');
    }
  }

  // --- Log warnings (both modes) ---
  for (const warning of warnings) {
    logger.warn(warning);
  }

  // --- Handle errors in production ---
  if (isProduction && errors.length > 0) {
    for (const error of errors) {
      logger.error(error);
    }
    logger.error('Environment validation failed. Exiting.');
    process.exit(1);
  }

  // --- Log success summary (without revealing secret values) ---
  const jwtSecretLength = (jwtSecret || DEFAULT_JWT_SECRET).length;
  logger.info('Configuration validated', {
    NODE_ENV: config.nodeEnv,
    PORT: config.port,
    jwtSecretLength,
    smtpHost: smtpHost ? '(set)' : '(not set)',
    adminEmail: adminEmail && adminEmail !== DEFAULT_ADMIN_EMAIL ? '(custom)' : '(default)',
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
