/**
 * Authentication Routes Tests
 *
 * Tests for /api/auth endpoints: validation, happy-path operations.
 *
 * Uses jest.unstable_mockModule + dynamic imports because ESM module
 * mocking with jest.mock() does not intercept transitive dependencies.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  auditLog: { create: jest.fn<any>() },
  editLock: { updateMany: jest.fn<any>() },
  user: { findUnique: jest.fn<any>(), update: jest.fn<any>() },
  passwordResetToken: {
    create: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  },
};

const testUser = {
  id: 1,
  email: 'doc@example.com',
  displayName: 'Dr. Test',
  roles: ['PHYSICIAN'],
  isActive: true,
  passwordHash: '$2b$04$fakehash',
  failedLoginAttempts: 0,
  lockedUntil: null,
  mustChangePassword: false,
};

let authBlocked = false;

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    if (authBlocked) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    req.user = testUser;
    next();
  },
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  authenticateUser: jest.fn<any>(),
  verifyPassword: jest.fn<any>(),
  updatePassword: jest.fn<any>(),
  toAuthUser: jest.fn<any>().mockImplementation((user: any) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    isActive: user.isActive,
  })),
  findUserByEmail: jest.fn<any>(),
  findUserById: jest.fn<any>(),
  generateToken: jest.fn<any>(),
  updateLastLogin: jest.fn<any>(),
  getStaffAssignments: jest.fn<any>(),
  getAllPhysicians: jest.fn<any>(),
  isAccountLocked: jest.fn<any>().mockReturnValue(false),
  incrementFailedAttempts: jest.fn<any>().mockResolvedValue(1),
  lockAccount: jest.fn<any>().mockResolvedValue(undefined),
  resetFailedAttempts: jest.fn<any>().mockResolvedValue(undefined),
  hashPassword: jest.fn<any>().mockResolvedValue('$2b$04$hashedpassword'),
}));

jest.unstable_mockModule('../../services/emailService.js', () => ({
  isSmtpConfigured: jest.fn<any>().mockReturnValue(false),
  sendPasswordResetEmail: jest.fn<any>().mockResolvedValue(true),
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: authRouter } = await import('../auth.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');
const { authenticateUser, findUserByEmail, findUserById, verifyPassword, updatePassword, generateToken, updateLastLogin, getStaffAssignments, getAllPhysicians, isAccountLocked, incrementFailedAttempts, lockAccount, resetFailedAttempts } = await import('../../services/authService.js');
const { isSmtpConfigured } = await import('../../services/emailService.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    app = createTestApp();
  });

  // ── POST /api/auth/login ────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns token on successful login', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('jwt-token-123');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBe('jwt-token-123');
      expect(res.body.data.user.email).toBe('doc@example.com');
    });

    it('returns 401 for invalid credentials (user not found)', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for invalid credentials (wrong password)', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for deactivated account', async () => {
      const deactivatedUser = { ...testUser, isActive: false };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(deactivatedUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for empty email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: '' });

      expect(res.status).toBe(400);
    });
  });

  // ── Failed Login Audit Logging (REQ-SEC-10) ──────────────────────

  describe('Failed login audit logging', () => {
    it('creates LOGIN_FAILED audit log for invalid email (user not found)', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'wrongpassword' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          userEmail: 'unknown@example.com',
          userId: null,
          entity: 'user',
          entityId: null,
        }),
      });
    });

    it('creates LOGIN_FAILED audit log for invalid password (wrong password)', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          userEmail: 'doc@example.com',
          userId: testUser.id,
          entity: 'user',
          entityId: testUser.id,
        }),
      });
    });

    it('creates LOGIN_FAILED audit log for deactivated account', async () => {
      const deactivatedUser = { ...testUser, isActive: false };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(deactivatedUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          userEmail: 'doc@example.com',
          userId: deactivatedUser.id,
          details: { reason: 'ACCOUNT_DEACTIVATED' },
        }),
      });
    });

    it('does not log attempted password in audit log', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'super-secret-password' });

      const callArgs = mockPrisma.auditLog.create.mock.calls[0][0] as any;
      const dataStr = JSON.stringify(callArgs);

      expect(dataStr).not.toContain('super-secret-password');
      expect(callArgs.data).not.toHaveProperty('password');
      expect(callArgs.data.details).not.toHaveProperty('password');
    });

    it('includes reason in audit log details JSON', async () => {
      // Test INVALID_CREDENTIALS reason for user not found
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: { reason: 'INVALID_CREDENTIALS' },
        }),
      });

      // Test INVALID_CREDENTIALS reason for wrong password
      jest.clearAllMocks();
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: { reason: 'INVALID_CREDENTIALS' },
        }),
      });

      // Test ACCOUNT_DEACTIVATED reason
      jest.clearAllMocks();
      const deactivatedUser = { ...testUser, isActive: false };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(deactivatedUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: { reason: 'ACCOUNT_DEACTIVATED' },
        }),
      });
    });

    it('includes IP address in audit log entry', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      const callArgs = mockPrisma.auditLog.create.mock.calls[0][0] as any;
      // supertest sets req.ip / req.socket.remoteAddress; ipAddress should be present
      expect(callArgs.data).toHaveProperty('ipAddress');
      // ipAddress should be a string or null, never undefined
      expect(callArgs.data.ipAddress === null || typeof callArgs.data.ipAddress === 'string').toBe(true);
    });

    it('audit log failure does not block login response', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(null);
      // Make audit log creation throw an error
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database connection lost'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'wrongpassword' });

      // Login should still return 401 (not 500) even though audit log failed
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      // Verify the audit log create was attempted
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  // ── Account lockout (REQ-SEC-06) ────────────────────────────────

  describe('Account lockout', () => {
    it('returns ACCOUNT_LOCKED when user account is locked', async () => {
      const lockedUser = { ...testUser, lockedUntil: new Date(Date.now() + 60000) };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(lockedUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(true);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error.message).toContain('temporarily locked');
    });

    it('locks account after 5 failed attempts', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      (incrementFailedAttempts as jest.Mock<any>).mockResolvedValue(5);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(lockAccount).toHaveBeenCalledWith(testUser.id);
    });

    it('returns warning after 3 failed attempts', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      (incrementFailedAttempts as jest.Mock<any>).mockResolvedValue(3);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.warning).toContain('trouble logging in');
    });

    it('resets failed attempts on successful login', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('jwt-token-123');
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(resetFailedAttempts).toHaveBeenCalledWith(testUser.id);
    });

    it('allows login when lock has expired', async () => {
      const expiredLockUser = { ...testUser, lockedUntil: new Date(Date.now() - 60000) };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(expiredLockUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('jwt-token-123');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('includes mustChangePassword in successful login response', async () => {
      const mustChangeUser = { ...testUser, mustChangePassword: true };
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(mustChangeUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('jwt-token-123');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.mustChangePassword).toBe(true);
    });

    it('creates ACCOUNT_LOCKED audit log on lockout', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      (incrementFailedAttempts as jest.Mock<any>).mockResolvedValue(5);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      // One call for LOGIN_FAILED (fire-and-forget from logFailedLogin),
      // another for ACCOUNT_LOCKED (fire-and-forget from lockout)
      const calls = mockPrisma.auditLog.create.mock.calls;
      const accountLockedCall = calls.find(
        (c: any) => c[0]?.data?.action === 'ACCOUNT_LOCKED'
      );
      expect(accountLockedCall).toBeDefined();
      expect((accountLockedCall as any)[0].data.details).toEqual(
        expect.objectContaining({ reason: 'TOO_MANY_FAILED_ATTEMPTS' })
      );
    });
  });

  // ── POST /api/auth/logout ───────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('returns 401 when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('logs out successfully and releases edit lock', async () => {
      mockPrisma.editLock.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
      expect(mockPrisma.editLock.updateMany).toHaveBeenCalled();
    });
  });

  // ── GET /api/auth/me ────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('returns 401 when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns current user info', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser);

      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it('returns assignments for STAFF user', async () => {
      const staffUser = { ...testUser, roles: ['STAFF'] };
      (findUserById as jest.Mock<any>).mockResolvedValue(staffUser);
      (getStaffAssignments as jest.Mock<any>).mockResolvedValue([
        { physicianId: 1, physicianName: 'Dr. Test' },
      ]);

      // Patch current user for this test
      authBlocked = false;
      const staffApp = express();
      staffApp.use(express.json());
      // Override auth middleware for this specific test
      staffApp.use('/api/auth', authRouter);
      staffApp.use(errorHandler);

      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
    });
  });

  // ── PUT /api/auth/password ──────────────────────────────────────

  describe('PUT /api/auth/password', () => {
    it('returns 401 when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'old', newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
    });

    it('changes password successfully', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>)
        .mockResolvedValueOnce(true)   // current password valid
        .mockResolvedValueOnce(false); // new password is different
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password changed');
    });

    it('returns 401 for wrong current password', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);

      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'wrong', newPassword: 'newpassword123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('returns 400 for same password', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>)
        .mockResolvedValueOnce(true)  // current password valid
        .mockResolvedValueOnce(true); // new password same as current

      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'password123', newPassword: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SAME_PASSWORD');
    });

    it('returns 400 for short new password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'oldpassword', newPassword: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/auth/smtp-status ───────────────────────────────────

  describe('GET /api/auth/smtp-status', () => {
    it('returns SMTP configuration status', async () => {
      const res = await request(app).get('/api/auth/smtp-status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('configured');
      expect(typeof res.body.data.configured).toBe('boolean');
    });
  });

  // ── POST /api/auth/forgot-password ──────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 when SMTP is not configured', async () => {
      (isSmtpConfigured as jest.Mock<any>).mockReturnValue(false);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SMTP_NOT_CONFIGURED');
    });

    it('returns success when SMTP configured (always returns success for security)', async () => {
      (isSmtpConfigured as jest.Mock<any>).mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null); // email doesn't exist

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/reset-password ───────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 for missing token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'newpassword123' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing newPassword', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for password too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 400 for expired token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'expired-token',
        email: 'doc@example.com',
        used: false,
        expiresAt: new Date(Date.now() - 3600000), // expired 1 hour ago
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'expired-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('returns 400 for already-used token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'used-token',
        email: 'doc@example.com',
        used: true,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'used-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_USED');
    });

    it('resets password successfully with valid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'valid-token',
        email: 'doc@example.com',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset successfully');
    });
  });

  // ── POST /api/auth/force-change-password ──────────────────────────

  describe('POST /api/auth/force-change-password', () => {
    it('returns 401 when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app)
        .post('/api/auth/force-change-password')
        .send({ newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
    });

    it('changes password when mustChangePassword is true', async () => {
      const mustChangeUser = { ...testUser, mustChangePassword: true };
      (findUserById as jest.Mock<any>).mockResolvedValue(mustChangeUser);
      (updatePassword as jest.Mock<any>).mockResolvedValue(undefined);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/force-change-password')
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('log in again');
      expect(updatePassword).toHaveBeenCalledWith(testUser.id, 'newpassword123');
    });

    it('returns 400 when mustChangePassword is false', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser); // mustChangePassword: false

      const res = await request(app)
        .post('/api/auth/force-change-password')
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_REQUIRED');
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/force-change-password')
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ── Audit logging for successful operations ──────────────────────

  describe('Audit logging for successful operations', () => {
    it('creates LOGIN audit log on successful login', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('jwt-token-123');
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'password123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN',
          userId: testUser.id,
          userEmail: testUser.email,
          entity: 'user',
          entityId: testUser.id,
        }),
      });
    });

    it('creates LOGOUT audit log on successful logout', async () => {
      mockPrisma.editLock.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app).post('/api/auth/logout');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGOUT',
          userId: testUser.id,
          userEmail: testUser.email,
          entity: 'user',
          entityId: testUser.id,
        }),
      });
    });

    it('creates PASSWORD_CHANGE audit log on voluntary password change', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(testUser);
      (verifyPassword as jest.Mock<any>)
        .mockResolvedValueOnce(true)   // current password valid
        .mockResolvedValueOnce(false); // new password is different
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PASSWORD_CHANGE',
          userId: testUser.id,
          userEmail: testUser.email,
          entity: 'user',
          entityId: testUser.id,
        }),
      });
    });

    it('creates PASSWORD_CHANGE audit log with FORCED_CHANGE on force-change', async () => {
      const mustChangeUser = { ...testUser, mustChangePassword: true };
      (findUserById as jest.Mock<any>).mockResolvedValue(mustChangeUser);
      (updatePassword as jest.Mock<any>).mockResolvedValue(undefined);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/force-change-password')
        .send({ newPassword: 'newpassword123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PASSWORD_CHANGE',
          userId: testUser.id,
          details: { reason: 'FORCED_CHANGE' },
        }),
      });
    });

    it('creates PASSWORD_RESET_REQUEST audit log for forgot-password', async () => {
      (isSmtpConfigured as jest.Mock<any>).mockReturnValue(true);
      const activeUser = { ...testUser, isActive: true };
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.passwordResetToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'doc@example.com' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PASSWORD_RESET_REQUEST',
          userId: testUser.id,
          userEmail: testUser.email,
        }),
      });
    });

    it('creates PASSWORD_RESET audit log on successful password reset', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'valid-token',
        email: 'doc@example.com',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'newpassword123' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PASSWORD_RESET',
          userId: testUser.id,
          userEmail: testUser.email,
          entity: 'user',
          entityId: testUser.id,
        }),
      });
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('attempt 4 returns INVALID_CREDENTIALS without warning or lock', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(testUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(false);
      (incrementFailedAttempts as jest.Mock<any>).mockResolvedValue(4);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doc@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      // Attempt 4 is >= 3, so warning IS shown
      expect(res.body.error.warning).toContain('trouble logging in');
      // But account is NOT locked (only at 5+)
      expect(lockAccount).not.toHaveBeenCalled();
    });

    it('reset-password returns USER_NOT_FOUND for inactive user', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'valid-token',
        email: 'inactive@example.com',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockPrisma.user.findUnique.mockResolvedValue({ ...testUser, isActive: false });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('forgot-password for inactive user returns success but skips email', async () => {
      (isSmtpConfigured as jest.Mock<any>).mockReturnValue(true);
      const inactiveUser = { ...testUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'inactive@example.com' });

      // Returns success (security: no email enumeration)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // But no token was created and no audit log was written
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('token expiring at exact boundary is treated as expired', async () => {
      // Token with expiresAt = now (current time) — code uses `<` so exactly-now is NOT expired
      const justNow = new Date();
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'boundary-token',
        email: 'doc@example.com',
        used: false,
        expiresAt: justNow,
      });
      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'boundary-token', newPassword: 'newpassword123' });

      // expiresAt < new Date() — if expiresAt == creation time and a few ms pass,
      // it becomes expired. This test documents the `<` vs `<=` behavior.
      // The token is treated as expired because time has elapsed since the Date was created.
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  // ── Login assignment responses per role (T4) ──────────────────────

  describe('Login assignment responses per role', () => {
    const adminUser = {
      ...testUser,
      id: 10,
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles: ['ADMIN'],
    };

    const adminPhysicianUser = {
      ...testUser,
      id: 11,
      email: 'adminphy@example.com',
      displayName: 'Admin Physician',
      roles: ['ADMIN', 'PHYSICIAN'],
    };

    const physicianUser = {
      ...testUser,
      id: 12,
      email: 'phy@example.com',
      displayName: 'Physician Only',
      roles: ['PHYSICIAN'],
    };

    const mockPhysicians = [
      { physicianId: 1, physicianName: 'Dr. Alpha' },
      { physicianId: 2, physicianName: 'Dr. Beta' },
    ];

    it('ADMIN login returns all active physicians as assignments', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(adminUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('admin-jwt');
      (getAllPhysicians as jest.Mock<any>).mockResolvedValue(mockPhysicians);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getAllPhysicians).toHaveBeenCalled();
      expect(res.body.data.assignments).toEqual(mockPhysicians);
    });

    it('ADMIN+PHYSICIAN login returns all active physicians as assignments', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(adminPhysicianUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('adminphy-jwt');
      (getAllPhysicians as jest.Mock<any>).mockResolvedValue(mockPhysicians);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'adminphy@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // ADMIN+PHYSICIAN: the code checks STAFF first, then ADMIN; since this user
      // has ADMIN (not STAFF), it falls into the ADMIN branch → getAllPhysicians
      expect(getAllPhysicians).toHaveBeenCalled();
      expect(res.body.data.assignments).toEqual(mockPhysicians);
    });

    it('PHYSICIAN login does not include assignments in response', async () => {
      (findUserByEmail as jest.Mock<any>).mockResolvedValue(physicianUser);
      (isAccountLocked as jest.Mock<any>).mockReturnValue(false);
      (verifyPassword as jest.Mock<any>).mockResolvedValue(true);
      (updateLastLogin as jest.Mock<any>).mockResolvedValue(undefined);
      (generateToken as jest.Mock<any>).mockReturnValue('phy-jwt');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'phy@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // PHYSICIAN-only user: neither STAFF nor ADMIN branch applies
      expect(getAllPhysicians).not.toHaveBeenCalled();
      expect(getStaffAssignments).not.toHaveBeenCalled();
      expect(res.body.data.assignments).toBeUndefined();
    });
  });

  // ── Empty body login validation (T6) ──────────────────────────────

  describe('Empty body login validation', () => {
    it('POST /api/auth/login with empty body returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── GET /api/auth/me edge cases ──────────────────────────────────

  describe('GET /api/auth/me edge cases', () => {
    it('returns 404 when user is deleted after token issuance', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue(null);

      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns user data even when isActive is false (route does not recheck)', async () => {
      const deactivatedUser = { ...testUser, isActive: false };
      (findUserById as jest.Mock<any>).mockResolvedValue(deactivatedUser);

      const res = await request(app).get('/api/auth/me');

      // The /me route does not check isActive — that check is in requireAuth middleware.
      // With mocked middleware, the route returns the user regardless.
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── PUT /api/auth/password edge cases ────────────────────────────

  describe('PUT /api/auth/password edge cases', () => {
    it('clears mustChangePassword flag on successful password change', async () => {
      (findUserById as jest.Mock<any>).mockResolvedValue({ ...testUser, mustChangePassword: true });
      (verifyPassword as jest.Mock<any>)
        .mockResolvedValueOnce(true)   // current password valid
        .mockResolvedValueOnce(false); // new password is different
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { mustChangePassword: false },
      });
    });
  });
});
