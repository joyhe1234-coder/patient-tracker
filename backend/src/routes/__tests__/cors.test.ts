/**
 * CORS Configuration Tests
 *
 * Verifies that CORS headers are set correctly on API responses,
 * including credentials, allowed origins, methods, and headers.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM pattern).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: {
    $queryRaw: jest.fn<any>().mockResolvedValue([{ '?column?': 1 }]),
    auditLog: { create: jest.fn<any>().mockResolvedValue({}) },
    editLock: { updateMany: jest.fn<any>().mockResolvedValue({ count: 0 }) },
    user: { findUnique: jest.fn<any>(), update: jest.fn<any>(), findMany: jest.fn<any>().mockResolvedValue([]) },
    passwordResetToken: { create: jest.fn<any>(), findUnique: jest.fn<any>(), update: jest.fn<any>() },
    patientMeasure: { findMany: jest.fn<any>().mockResolvedValue([]) },
    importMapping: { findMany: jest.fn<any>().mockResolvedValue([]) },
    staffAssignment: { findMany: jest.fn<any>().mockResolvedValue([]) },
  },
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
    port: 3000,
    nodeEnv: 'test',
    lockTimeoutMinutes: 5,
    heartbeatInterval: 120000,
  },
}));

jest.unstable_mockModule('../../services/emailService.js', () => ({
  isSmtpConfigured: jest.fn<any>().mockReturnValue(false),
  sendPasswordResetEmail: jest.fn<any>().mockResolvedValue(true),
  sendTempPasswordEmail: jest.fn<any>().mockResolvedValue(true),
  sendAdminPasswordResetNotification: jest.fn<any>().mockResolvedValue(true),
  sendEmail: jest.fn<any>().mockResolvedValue(true),
  _resetTransporterForTesting: jest.fn<any>(),
  _getTransporterForTesting: jest.fn<any>().mockReturnValue(null),
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  authenticateUser: jest.fn<any>(),
  findUserByEmail: jest.fn<any>(),
  findUserById: jest.fn<any>(),
  verifyPassword: jest.fn<any>(),
  verifyToken: jest.fn<any>().mockReturnValue(null),
  updatePassword: jest.fn<any>(),
  generateToken: jest.fn<any>(),
  updateLastLogin: jest.fn<any>(),
  getStaffAssignments: jest.fn<any>().mockResolvedValue([]),
  getAllPhysicians: jest.fn<any>().mockResolvedValue([]),
  isStaffAssignedToPhysician: jest.fn<any>().mockResolvedValue(false),
  hashPassword: jest.fn<any>().mockResolvedValue('$2b$04$hashed'),
  toAuthUser: jest.fn<any>(),
  isAccountLocked: jest.fn<any>().mockReturnValue(false),
  incrementFailedAttempts: jest.fn<any>(),
  lockAccount: jest.fn<any>(),
  resetFailedAttempts: jest.fn<any>(),
  generateTempPassword: jest.fn<any>().mockReturnValue('TempPass123!'),
  sendTempPassword: jest.fn<any>().mockResolvedValue({ emailSent: false, tempPassword: 'TempPass123!' }),
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: app } = await import('../../app.js');

// ── Tests ──────────────────────────────────────────────────────────

describe('CORS Configuration', () => {
  it('API response includes Access-Control-Allow-Credentials header', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('development mode allows localhost:5173 origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('preflight request returns correct allowed methods', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    const allowedMethods = res.headers['access-control-allow-methods'];
    expect(allowedMethods).toBeDefined();
    expect(allowedMethods).toContain('GET');
    expect(allowedMethods).toContain('POST');
    expect(allowedMethods).toContain('PUT');
    expect(allowedMethods).toContain('PATCH');
    expect(allowedMethods).toContain('DELETE');
  });

  it('preflight request returns correct allowed headers', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(res.headers['access-control-allow-headers']).toBeDefined();
  });
});
